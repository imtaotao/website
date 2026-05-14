import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { StyleProcessor } from '#infra/css/styleProcessor';
import { ModuleStyleImportCollector } from '#infra/css/moduleStyleImportCollector';
import type {
  CssOptions,
  ModuleCssBuildConfig,
  ModuleCssBuildContext,
  ResolvedModuleCssBuildContext,
} from '#infra/css/types';
import { moduleCssBuildConfig } from '#infra/css/config';
import { WorkspaceStyleResolver } from '#infra/css/workspaceStyleResolver';
import { fileWalker, getSourceModuleDir, toPosixPath } from '#infra/utils';

export class ModuleCssBuilder {
  private srcRoot: string;
  private resolver: WorkspaceStyleResolver;
  private styleProcessor: StyleProcessor;
  private importCollector: ModuleStyleImportCollector;

  constructor(
    private readonly context: ModuleCssBuildContext,
    private readonly config: ModuleCssBuildConfig = moduleCssBuildConfig,
  ) {
    this.applyContext(this.createBuildContext({}));
  }

  async build() {
    const cssOptions = await this.loadCssOptions();
    const context = this.createBuildContext(cssOptions);

    this.applyContext(context);

    const sourceFiles = fileWalker(this.srcRoot);
    const styleFiles = this.getStyleFiles(sourceFiles);
    const moduleStyleImports = this.importCollector.collect(
      sourceFiles,
      cssOptions,
    );
    this.writePackageStyles(styleFiles, cssOptions, context);

    for (const format of this.config.output.outputFormats) {
      const outRoot = path.join(context.packageRoot, context.outputDir, format);
      this.copyStyleFiles(styleFiles, outRoot);
      this.writeEntryStyle(styleFiles, outRoot, cssOptions);
      this.writeComponentStyleEntries(styleFiles, outRoot, moduleStyleImports);
    }
  }

  private getStyleFiles(files: Array<string>) {
    return files.filter((file) =>
      Boolean(this.config.styleExtensions[path.extname(file)]),
    );
  }

  private async loadCssOptions() {
    const configPath = path.join(
      this.context.packageRoot,
      this.config.cssConfigFile,
    );
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const { config } = await import(pathToFileURL(configPath).href);
    return config ?? {};
  }

  private createBuildContext(cssOptions: CssOptions) {
    return {
      packageRoot: this.context.packageRoot,
      sourceDir: cssOptions.sourceDir ?? this.context.sourceDir ?? 'src',
      outputDir: cssOptions.outputDir ?? this.context.outputDir ?? 'dist',
    };
  }

  private applyContext(context: ResolvedModuleCssBuildContext) {
    this.srcRoot = path.join(context.packageRoot, context.sourceDir);
    this.resolver = new WorkspaceStyleResolver(this.config, context);
    this.styleProcessor = new StyleProcessor(this.config, this.resolver);
    this.importCollector = new ModuleStyleImportCollector(
      this.srcRoot,
      context.packageRoot,
      this.resolver,
      Object.keys(this.config.styleExtensions),
    );
  }

  private copyStyleFiles(files: Array<string>, outRoot: string) {
    for (const sourceFile of files) {
      const relative = path.relative(this.srcRoot, sourceFile);
      const target = path.join(outRoot, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(sourceFile, target);
    }
  }

  private writePackageStyles(
    styleFiles: Array<string>,
    buildConfig: CssOptions,
    context: ResolvedModuleCssBuildContext,
  ) {
    const seen = new Set<string>();
    const root = this.styleProcessor.createRoot();

    for (const specifier of this.getGlobalStyleDependencies(buildConfig)) {
      const cssPath = this.resolver.resolveStyleDependency(specifier);
      if (!cssPath) continue;
      const content = this.styleProcessor.readStyleFile(cssPath, seen);
      if (content.trim()) {
        this.styleProcessor.appendStyleContent(root, content, cssPath);
      }
    }

    for (const styleFile of styleFiles) {
      const content = this.styleProcessor.readStyleFile(styleFile, seen);
      if (content.trim()) {
        this.styleProcessor.appendStyleContent(root, content, styleFile);
      }
    }

    if (!root.nodes?.length) return;

    fs.mkdirSync(path.join(context.packageRoot, context.outputDir), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        context.packageRoot,
        context.outputDir,
        this.config.output.indexCssFile,
      ),
      this.styleProcessor.stringify(root),
    );
  }

  private writeEntryStyle(
    styleFiles: Array<string>,
    outRoot: string,
    buildConfig: CssOptions,
  ) {
    const target = path.join(
      outRoot,
      this.config.output.styleDir,
      this.config.output.indexCssFile,
    );
    const seen = new Set<string>();
    const root = this.styleProcessor.createRoot();

    for (const specifier of this.getGlobalStyleDependencies(buildConfig)) {
      this.styleProcessor.appendImportRule(
        root,
        this.resolver.toOutputStyleSpecifier(specifier, outRoot),
      );
    }
    for (const styleFile of styleFiles) {
      const content = this.styleProcessor.readStyleFile(styleFile, seen);
      if (content.trim()) {
        this.styleProcessor.appendStyleContent(root, content, styleFile);
      }
    }
    if (!root.nodes?.length) return;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, this.styleProcessor.stringify(root));
  }

  private getGlobalStyleDependencies(buildConfig: CssOptions) {
    const dependencies: Array<string> = [];
    for (const [packageName, dependency] of Object.entries(
      buildConfig.cssDependencies ?? {},
    )) {
      const globalDependencies = Array.isArray(dependency.global)
        ? dependency.global
        : [dependency.global].filter((value): value is string =>
            Boolean(value),
          );

      for (const globalDependency of globalDependencies) {
        dependencies.push(
          this.joinDependencySpecifier(packageName, globalDependency),
        );
      }
    }
    return dependencies;
  }

  private joinDependencySpecifier(packageName: string, dependencyPath: string) {
    if (!dependencyPath) return packageName;
    return dependencyPath.startsWith('/')
      ? `${packageName}${dependencyPath}`
      : `${packageName}/${dependencyPath}`;
  }

  private writeComponentStyleEntries(
    styleFiles: Array<string>,
    outRoot: string,
    moduleStyleImports: Map<string, Array<string>>,
  ) {
    const styleFilesByDir = this.groupStyleFilesByDir(styleFiles);
    const importedStyleFiles =
      this.styleProcessor.collectImportedStyleFiles(styleFiles);
    const sourceDirs = Array.from(
      new Set([...styleFilesByDir.keys(), ...moduleStyleImports.keys()]),
    );

    for (const sourceDir of sourceDirs) {
      if (sourceDir === '.') continue;

      const dirStyleFiles = styleFilesByDir.get(sourceDir) ?? [];
      const styleDir = path.join(
        outRoot,
        sourceDir,
        this.config.output.styleDir,
      );
      const target = path.join(styleDir, this.config.output.indexCssFile);
      const sourceStyleSpecifiers = [
        ...this.getModuleStyleSpecifiers(
          moduleStyleImports.get(sourceDir) ?? [],
          styleDir,
        ),
        ...this.getDirStyleSpecifiers(
          dirStyleFiles,
          importedStyleFiles,
          styleDir,
          outRoot,
        ),
      ];
      const root = this.styleProcessor.createRoot();
      const seen = new Set<string>();

      for (const specifier of sourceStyleSpecifiers) {
        if (seen.has(specifier)) continue;
        seen.add(specifier);
        this.styleProcessor.appendImportRule(
          root,
          this.resolver.toOutputStyleSpecifier(specifier, outRoot),
        );
      }

      if (!root.nodes?.length) {
        fs.rmSync(target, { force: true });
        continue;
      }
      fs.mkdirSync(styleDir, { recursive: true });
      fs.writeFileSync(target, this.styleProcessor.stringify(root));
    }
  }

  private groupStyleFilesByDir(styleFiles: Array<string>) {
    const styleFilesByDir = new Map<string, Array<string>>();
    for (const styleFile of styleFiles) {
      const sourceRelative = path.relative(this.srcRoot, styleFile);
      const sourceDir = getSourceModuleDir(sourceRelative);
      const values = styleFilesByDir.get(sourceDir) ?? [];
      values.push(styleFile);
      styleFilesByDir.set(sourceDir, values);
    }
    return styleFilesByDir;
  }

  private getModuleStyleSpecifiers(
    specifiers: Array<string>,
    styleDir: string,
  ) {
    return specifiers.map((specifier) => {
      if (specifier.startsWith('.')) return specifier;
      if (!path.isAbsolute(specifier)) return specifier;
      return toPosixPath(path.relative(styleDir, specifier));
    });
  }

  private getDirStyleSpecifiers(
    dirStyleFiles: Array<string>,
    importedStyleFiles: Set<string>,
    styleDir: string,
    outRoot: string,
  ) {
    return dirStyleFiles
      .filter((styleFile) => !importedStyleFiles.has(path.resolve(styleFile)))
      .map((styleFile) =>
        toPosixPath(
          path.relative(
            styleDir,
            path.join(outRoot, path.relative(this.srcRoot, styleFile)),
          ),
        ),
      );
  }
}
