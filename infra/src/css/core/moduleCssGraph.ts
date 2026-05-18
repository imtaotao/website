import fs from 'node:fs';
import path from 'node:path';
import { moduleCssBuildConfig } from '#infra/css/core/config';
import { loadCssOptions } from '#infra/css/core/cssOptions';
import { ModuleStyleImportCollector } from '#infra/css/core/moduleStyleImportCollector';
import {
  normalizeCssFileKey,
  toCssFsSpecifier,
  toCssWatchPath,
} from '#infra/css/core/path';
import {
  createImportCode,
  EXTERNAL_ENTRY,
  getGlobalStyleDependencies,
  groupStyleFilesByDir,
  KERNEL_PACKAGE_PREFIX,
  MODULE_ENTRY,
  parsePackageStyleSpecifier,
  removeCssExtension,
  STYLE_ENTRY,
} from '#infra/css/core/styleEntry';
import { StyleProcessor } from '#infra/css/core/styleProcessor';
import type {
  CssOptions,
  ModuleCssBuildConfig,
  ResolvedModuleCssBuildContext,
} from '#infra/css/core/types';
import { WorkspaceStyleResolver } from '#infra/css/core/workspaceStyleResolver';
import { fileWalker, toPosixPath } from '#infra/utils';

type KernelCssContext = {
  cssOptions: CssOptions;
  context: ResolvedModuleCssBuildContext;
  packageName: string;
  configPath: string;
  resolver: WorkspaceStyleResolver;
  sourceRoot: string;
  styleProcessor: StyleProcessor;
};

const mergeLoadResults = (...results: Array<KernelCssLoadResult>) => {
  return {
    code: results
      .map((result) => result.code)
      .filter((code) => code.trim())
      .join('\n'),
    watchFiles: Array.from(
      new Set(results.flatMap((result) => result.watchFiles)),
    ),
  };
};

export interface ModuleCssGraphOptions {
  workspaceRoot: string;
  config?: ModuleCssBuildConfig;
}

export type KernelCssId = {
  packageName: string;
  packageSlug: string;
  cssPath: string;
};

export type KernelCssLoadResult = {
  code: string;
  watchFiles: Array<string>;
};

export class ModuleCssGraph {
  private readonly config: ModuleCssBuildConfig;
  private readonly workspaceRoot: string;

  constructor(options: ModuleCssGraphOptions) {
    this.config = options.config ?? moduleCssBuildConfig;
    this.workspaceRoot = normalizeCssFileKey(options.workspaceRoot);
  }

  parseKernelCssId(id: string) {
    return parseKernelCssId(id);
  }

  isKernelSourceGraphFile(file: string) {
    const normalizedFile = normalizeCssFileKey(file);
    if (!normalizedFile.includes('/packages/kernel-')) {
      return false;
    }
    if (normalizedFile.endsWith(this.config.cssConfigFile)) return true;
    if (normalizedFile.endsWith('.ts') || normalizedFile.endsWith('.tsx')) {
      return true;
    }

    return Object.keys(this.config.styleExtensions).some((extension) =>
      normalizedFile.endsWith(extension),
    );
  }

  isCssConfigFile(file: string) {
    return normalizeCssFileKey(file).endsWith(this.config.cssConfigFile);
  }

  isStyleFile(file: string) {
    return Boolean(this.config.styleExtensions[path.extname(file)]);
  }

  getKernelPackageNames() {
    const packagesRoot = path.join(this.workspaceRoot, 'packages');
    if (!fs.existsSync(packagesRoot)) return [];

    return fs
      .readdirSync(packagesRoot, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && entry.name.startsWith('kernel-'),
      )
      .map((entry) => `${KERNEL_PACKAGE_PREFIX}${entry.name.slice(7)}`);
  }

  getWatchRoots() {
    const packagesRoot = path.join(this.workspaceRoot, 'packages');
    return [
      toCssWatchPath(packagesRoot, 'kernel-*', 'src'),
      toCssWatchPath(packagesRoot, 'kernel-*', this.config.cssConfigFile),
    ];
  }

  async createKernelCssCode(parsed: KernelCssId): Promise<KernelCssLoadResult> {
    const context = await this.createContext(parsed);
    if (!context) {
      return {
        code: '',
        watchFiles: [],
      };
    }

    if (parsed.cssPath === STYLE_ENTRY) {
      const external = await this.createExternalCssCode(context);
      const module = this.createModuleCssCode(context);
      return mergeLoadResults(external, module);
    }
    if (parsed.cssPath === EXTERNAL_ENTRY) {
      return this.createExternalCssCode(context);
    }
    if (parsed.cssPath === MODULE_ENTRY) {
      return this.createModuleCssCode(context);
    }
    return this.createSourceModuleCssCode(context, parsed.cssPath);
  }

  private async createContext(parsed: KernelCssId) {
    const packageRoot = path.join(
      this.workspaceRoot,
      'packages',
      `kernel-${parsed.packageSlug}`,
    );
    if (!fs.existsSync(packageRoot)) return null;

    const cssOptions = await loadCssOptions(
      packageRoot,
      this.config.cssConfigFile,
      {
        cacheBust: true,
      },
    );
    const context: ResolvedModuleCssBuildContext = {
      packageRoot,
      sourceDir: cssOptions.sourceDir ?? 'src',
      outputDir: cssOptions.outputDir ?? 'dist',
    };
    const sourceRoot = path.join(packageRoot, context.sourceDir);
    const resolver = new WorkspaceStyleResolver(this.config, context);
    const styleProcessor = new StyleProcessor(this.config, resolver);

    return {
      cssOptions,
      context,
      packageName: parsed.packageName,
      configPath: path.join(packageRoot, this.config.cssConfigFile),
      resolver,
      sourceRoot,
      styleProcessor,
    };
  }

  private async createExternalCssCode(context: KernelCssContext) {
    const results: Array<KernelCssLoadResult> = [];
    const imports: Array<string> = [];

    for (const specifier of getGlobalStyleDependencies(context.cssOptions)) {
      const external = this.toDevExternalStyleSpecifier(specifier);
      const parsed = parseKernelCssId(external);
      if (parsed) {
        results.push(await this.createKernelCssCode(parsed));
        continue;
      }
      imports.push(external);
    }

    return mergeLoadResults(
      {
        code: createImportCode(imports),
        watchFiles: [context.configPath],
      },
      ...results,
    );
  }

  private createModuleCssCode(context: KernelCssContext) {
    const styleFiles = this.getStyleFiles(context.sourceRoot);
    const root = context.styleProcessor.createRoot();
    const seen = new Set<string>();

    for (const styleFile of styleFiles) {
      const content = context.styleProcessor.readStyleFile(styleFile, seen);
      if (content.trim()) {
        context.styleProcessor.appendStyleContent(root, content, styleFile);
      }
    }

    return {
      code: root.nodes?.length ? context.styleProcessor.stringify(root) : '',
      watchFiles: [context.configPath, ...styleFiles],
    };
  }

  private async createSourceModuleCssCode(
    context: KernelCssContext,
    cssPath: string,
  ) {
    const sourceModuleDir = removeCssExtension(cssPath);
    const styleFiles = this.getStyleFiles(context.sourceRoot);
    const styleFilesByDir = groupStyleFilesByDir(
      context.sourceRoot,
      styleFiles,
    );
    const importedStyleFiles =
      context.styleProcessor.collectImportedStyleFiles(styleFiles);
    const importCollector = new ModuleStyleImportCollector(
      context.sourceRoot,
      context.context.packageRoot,
      context.resolver,
      Object.keys(this.config.styleExtensions),
    );
    const sourceFiles = fileWalker(context.sourceRoot);
    const moduleStyleImports = importCollector.collect(
      sourceFiles,
      context.cssOptions,
    );
    const sourceStyleDir = path.join(
      context.sourceRoot,
      sourceModuleDir,
      this.config.output.styleDir,
    );
    const moduleStyleResults: Array<KernelCssLoadResult> = [];
    const moduleStyleSpecifiers: Array<string> = [];

    for (const specifier of moduleStyleImports.get(sourceModuleDir) ?? []) {
      const result = this.toDevModuleImportSpecifier(
        context,
        sourceStyleDir,
        specifier,
      );
      const parsed = parseKernelCssId(result);
      if (parsed) {
        moduleStyleResults.push(await this.createKernelCssCode(parsed));
        continue;
      }
      moduleStyleSpecifiers.push(result);
    }

    const ownStyleFiles = (styleFilesByDir.get(sourceModuleDir) ?? []).filter(
      (styleFile) => !importedStyleFiles.has(path.resolve(styleFile)),
    );
    const root = context.styleProcessor.createRoot();
    const seen = new Set<string>();

    for (const ownStyleFile of ownStyleFiles) {
      const content = context.styleProcessor.readStyleFile(ownStyleFile, seen);
      if (content.trim()) {
        context.styleProcessor.appendStyleContent(root, content, ownStyleFile);
      }
    }
    const ownStyleCode = root.nodes?.length
      ? context.styleProcessor.stringify(root)
      : '';

    return mergeLoadResults(...moduleStyleResults, {
      code: [createImportCode(moduleStyleSpecifiers), ownStyleCode]
        .filter((code) => code.trim())
        .join('\n'),
      watchFiles: [
        context.configPath,
        ...styleFiles,
        ...sourceFiles.filter((file) => /\.(ts|tsx)$/.test(file)),
      ],
    });
  }

  private getStyleFiles(sourceRoot: string) {
    if (!fs.existsSync(sourceRoot)) return [];
    return fileWalker(sourceRoot).filter((file) =>
      Boolean(this.config.styleExtensions[path.extname(file)]),
    );
  }

  private toDevModuleImportSpecifier(
    context: KernelCssContext,
    sourceStyleDir: string,
    specifier: string,
  ) {
    if (!specifier.startsWith('.')) {
      return this.toDevExternalStyleSpecifier(specifier);
    }

    const outputStyleEntry = path.resolve(sourceStyleDir, specifier);
    const styleEntrySuffix = `${path.sep}${this.config.output.styleDir}${path.sep}${this.config.output.indexCssFile}`;
    if (!outputStyleEntry.endsWith(styleEntrySuffix)) {
      return toCssFsSpecifier(outputStyleEntry);
    }

    const sourceModuleDir = path.relative(
      context.sourceRoot,
      outputStyleEntry.slice(0, -styleEntrySuffix.length),
    );
    return `${context.packageName}/${toPosixPath(sourceModuleDir)}.css`;
  }

  private toDevExternalStyleSpecifier(specifier: string) {
    const parsed = parsePackageStyleSpecifier(specifier);
    if (!parsed) return specifier;

    if (parsed.packageName.startsWith(KERNEL_PACKAGE_PREFIX)) {
      if (parsed.stylePath === STYLE_ENTRY) {
        return `${parsed.packageName}/${EXTERNAL_ENTRY}`;
      }
      if (
        parsed.stylePath ===
        [this.config.output.styleDir, this.config.output.indexCssFile].join('/')
      ) {
        return `${parsed.packageName}/${EXTERNAL_ENTRY}`;
      }
    }
    return specifier;
  }
}

export function parseKernelCssId(id: string): KernelCssId | null {
  if (!id.startsWith(KERNEL_PACKAGE_PREFIX) || !id.endsWith('.css')) {
    return null;
  }

  const parts = id.slice(KERNEL_PACKAGE_PREFIX.length).split('/');
  const packageSlug = parts.shift();
  if (!packageSlug || !parts.length) return null;

  return {
    packageName: `${KERNEL_PACKAGE_PREFIX}${packageSlug}`,
    packageSlug,
    cssPath: parts.join('/'),
  };
}
