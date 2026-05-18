import fs from 'node:fs';
import path from 'node:path';
import {
  ModuleCssGraph,
  type ModuleCssGraphOptions,
} from '#infra/css/core/index';

const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const VIRTUAL_ID_PREFIX = 'virtual:website-kernel-css:';
const RESOLVED_VIRTUAL_ID_PREFIX = '\0website-kernel-css:';

const stripQuery = (id: string) => id.split('?')[0];

const findWorkspaceRoot = (startDir: string) => {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, WORKSPACE_FILE))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

const createModuleCssGraph = (
  options: WebsiteKernelCssPluginOptions,
  viteRoot: string,
) => {
  const workspaceRoot =
    options.workspaceRoot ?? findWorkspaceRoot(viteRoot) ?? process.cwd();
  return new ModuleCssGraph({
    ...options,
    workspaceRoot,
  });
};

const invalidateVirtualModules = (
  server: {
    moduleGraph: {
      invalidateModule: (module: unknown) => void;
      getModuleById: (id: string) => unknown;
    };
  },
  graph: ModuleCssGraph,
) => {
  for (const packageName of graph.getKernelPackageNames()) {
    for (const entry of ['style.css', 'external.css', 'module.css']) {
      const module = server.moduleGraph.getModuleById(
        `${RESOLVED_VIRTUAL_ID_PREFIX}${packageName}/${entry}`,
      );
      if (module) server.moduleGraph.invalidateModule(module);
    }
  }
};

export type WebsiteKernelCssPluginOptions = Partial<
  Pick<ModuleCssGraphOptions, 'workspaceRoot'>
> &
  Omit<ModuleCssGraphOptions, 'workspaceRoot'>;

export function websiteKernelCssPlugin(
  options: WebsiteKernelCssPluginOptions = {},
) {
  let graph: ModuleCssGraph | null = null;

  const getGraph = () => {
    if (!graph) {
      graph = createModuleCssGraph(options, process.cwd());
    }
    return graph;
  };

  return {
    name: 'website-kernel-css',
    apply: 'serve',
    enforce: 'pre',

    configResolved(config: { root: string }) {
      graph = createModuleCssGraph(options, config.root);
    },

    resolveId(id: string) {
      const graph = getGraph();
      const cleanId = stripQuery(id);
      if (cleanId.startsWith(VIRTUAL_ID_PREFIX)) {
        return `${RESOLVED_VIRTUAL_ID_PREFIX}${cleanId.slice(
          VIRTUAL_ID_PREFIX.length,
        )}`;
      }
      if (!graph.parseKernelCssId(cleanId)) return null;
      return `${RESOLVED_VIRTUAL_ID_PREFIX}${cleanId}`;
    },

    async load(this: { addWatchFile?: (file: string) => void }, id: string) {
      if (!id.startsWith(RESOLVED_VIRTUAL_ID_PREFIX)) return null;

      const originalId = id.slice(RESOLVED_VIRTUAL_ID_PREFIX.length);
      const graph = getGraph();
      const parsed = graph.parseKernelCssId(originalId);
      if (!parsed) return null;

      const result = await graph.createKernelCssCode(parsed);
      for (const file of result.watchFiles) {
        this.addWatchFile?.(file);
      }
      return result.code;
    },

    configureServer(server: {
      watcher: {
        add: (paths: string | Array<string>) => void;
        on: (event: string, listener: (file: string) => void) => void;
      };
      ws: {
        send: (payload: { type: string }) => void;
      };
      moduleGraph: {
        invalidateModule: (module: unknown) => void;
        getModuleById: (id: string) => unknown;
      };
    }) {
      const graph = getGraph();
      server.watcher.add(graph.getWatchRoots());

      const handleGraphChange = (file: string) => {
        if (!graph.isKernelSourceGraphFile(file)) return;

        invalidateVirtualModules(server, graph);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', handleGraphChange);
      server.watcher.on('unlink', handleGraphChange);
      server.watcher.on('change', (file) => {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          handleGraphChange(file);
          return;
        }
        if (graph.isCssConfigFile(file)) {
          handleGraphChange(file);
        }
      });
    },
  };
}
