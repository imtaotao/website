import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { loadCssOptions } from '#infra/css/core/index';
import { moduleCssBuildConfig } from '#infra/css/core/index';
import type {
  ModuleCssBuildConfig,
  ModuleCssBuildContext,
} from '#infra/css/core/index';
import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';

export class ModuleCssWatcher {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isBuilding = false;
  private shouldRebuild = false;
  private watcher: FSWatcher | null = null;

  constructor(
    private readonly context: ModuleCssBuildContext,
    private readonly config: ModuleCssBuildConfig = moduleCssBuildConfig,
  ) {}

  async watch() {
    await this.rebuild();
    console.log('[infra:css] watch mode ready');

    process.once('SIGINT', this.handleClose);
    process.once('SIGTERM', this.handleClose);
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
    });
    this.watcher.on('all', () => {
      this.scheduleBuild();
    });
    this.watcher.on('error', (error) => {
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

  private handleClose = () => {
    this.close()
      .catch(console.error)
      .finally(() => process.exit(0));
  };

  private async close() {
    if (this.timer) clearTimeout(this.timer);
    await this.watcher?.close();
  }
}
