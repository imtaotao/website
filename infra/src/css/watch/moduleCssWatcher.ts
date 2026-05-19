import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { moduleCssBuildConfig } from '#infra/css/core/config';
import { loadCssOptions } from '#infra/css/core/cssOptions';
import type { ModuleCssBuildConfig, ModuleCssBuildContext } from '#infra/types';
import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';

type Watcher = {
  close: () => Promise<void>;
  on: {
    (event: 'all', listener: () => void): Watcher;
    (event: 'error', listener: (error: unknown) => void): Watcher;
  };
};

export class ModuleCssWatcher {
  private readonly context: ModuleCssBuildContext & { packageRoot: string };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isBuilding = false;
  private shouldRebuild = false;
  private watcher: Watcher | null = null;

  constructor(
    context: ModuleCssBuildContext = {},
    private readonly config: ModuleCssBuildConfig = moduleCssBuildConfig,
  ) {
    this.context = {
      packageRoot: process.cwd(),
      ...context,
    };
  }

  async watch() {
    await this.rebuild();
    console.log('[infra:css] watch mode ready');
  }

  private async rebuild() {
    if (this.isBuilding) {
      this.shouldRebuild = true;
      return;
    }
    this.isBuilding = true;
    try {
      const builder = new ModuleCssBuilder(this.context, this.config);
      await builder.build({ cacheBust: true });
      await this.refreshWatcher();
    } catch (error) {
      console.error(error);
    } finally {
      this.isBuilding = false;
      if (this.shouldRebuild) {
        this.shouldRebuild = false;
        this.scheduleBuild();
      }
    }
  }

  private async refreshWatcher() {
    const cssOptions = await loadCssOptions(
      this.context.packageRoot,
      this.config.cssConfigFile,
      { cacheBust: true },
    );
    const sourceDir = cssOptions.sourceDir ?? this.context.sourceDir ?? 'src';
    const sourceRoot = path.join(this.context.packageRoot, sourceDir);
    const configPath = path.join(
      this.context.packageRoot,
      this.config.cssConfigFile,
    );
    const watchPaths = [sourceRoot, configPath].filter((file) =>
      fs.existsSync(file),
    );

    await this.watcher?.close();
    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      interval: 300,
      usePolling: true,
    }) as unknown as Watcher;
    this.watcher.on('all', () => {
      this.scheduleBuild();
    });
    this.watcher.on('error', (error: unknown) => {
      console.error(error);
    });
  }

  private scheduleBuild() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.rebuild().catch(console.error);
    }, 80);
  }

  async close() {
    if (this.timer) clearTimeout(this.timer);
    await this.watcher?.close();
  }
}
