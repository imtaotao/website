import fs from 'node:fs';
import path from 'node:path';
import { isArray } from 'aidly';
import { StyleProcessor } from '#infra/css/styleProcessor';
import { ModuleStyleImportCollector } from '#infra/css/moduleStyleImportCollector';
import type {
  CssOptions,
  ModuleCssBuildConfig,
  ModuleCssBuildContext,
  ResolvedModuleCssBuildContext,
} from '#infra/css/types';
import { moduleCssBuildConfig } from '#infra/css/config';
import { loadCssOptions } from '#infra/css/cssOptions';
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

  async build(options: { cacheBust?: boolean } = {}) {
    const cssOptions = await this.loadCssOptions(options);
    const context = this.createBuildContext(cssOptions);

    this.applyContext(context);

    console.log(`[infra:css] build ${path.basename(context.packageRoot)}`);

    const sourceFiles = fileWalker(this.srcRoot);
    const styleFiles = this.getStyleFiles(sourceFiles);
    const moduleStyleImports = this.importCollector.collect(
      sourceFiles,
      cssOptions,
    );
    const outputs: Array<string> = [];
    const packageStyle = this.writePackageStyles(
      styleFiles,
      cssOptions,
      context,
    );
    if (packageStyle) outputs.push(packageStyle);

    for (const format of this.config.output.outputFormats) {
      const outRoot = path.join(context.packageRoot, context.outputDir, format);
      this.copyStyleFiles(styleFiles, outRoot);
      const externalStyle = this.writeExternalStyle(outRoot, cssOptions);
      const moduleStyle = this.writeModuleStyle(styleFiles, outRoot);
      const entryStyle = this.writeEntryStyle(
        outRoot,
        externalStyle,
        moduleStyle,
      );

      if (externalStyle) outputs.push(externalStyle);
      if (moduleStyle) outputs.push(moduleStyle);
      if (entryStyle) outputs.push(entryStyle);
      outputs.push(
        ...this.writeComponentStyleEntries(
          styleFiles,
          outRoot,
          moduleStyleImports,
        ),
      );
    }

    console.log(
      `[infra:css] ${styleFiles.length} source style file(s), ${outputs.length} output entry file(s)`,
    );
    for (const output of outputs) {
      console.log(
        `[infra:css] + ${toPosixPath(
          path.relative(context.packageRoot, output),
        )}`,
      );
    }
  }

  private getStyleFiles(files: Array<string>) {
    return files.filter((file) =>
      Boolean(this.config.styleExtensions[path.extname(file)]),
    );
  }

  private async loadCssOptions(options: { cacheBust?: boolean } = {}) {
    return loadCssOptions(
      this.context.packageRoot,
      this.config.cssConfigFile,
      options,
    );
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

    if (!root.nodes?.length) return null;

    fs.mkdirSync(path.join(context.packageRoot, context.outputDir), {
      recursive: true,
    });
    const target = path.join(
      context.packageRoot,
      context.outputDir,
      this.config.output.indexCssFile,
    );
    fs.writeFileSync(target, this.styleProcessor.stringify(root));
    return target;
  }

  private writeEntryStyle(
    outRoot: string,
    externalStyle: string | null,
    moduleStyle: string | null,
  ) {
    const target = path.join(
      outRoot,
      this.config.output.styleDir,
      this.config.output.indexCssFile,
    );
    const root = this.styleProcessor.createRoot();
    const styleDir = path.dirname(target);

    for (const style of [externalStyle, moduleStyle]) {
      if (!style) continue;
      this.styleProcessor.appendImportRule(
        root,
        this.toRelativeImportSpecifier(styleDir, style),
      );
    }
    if (!root.nodes?.length) return null;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, this.styleProcessor.stringify(root));
    return target;
  }

  private writeModuleStyle(styleFiles: Array<string>, outRoot: string) {
    const target = path.join(
      outRoot,
      this.config.output.styleDir,
      this.config.output.moduleCssFile,
    );
    const seen = new Set<string>();
    const root = this.styleProcessor.createRoot();

    for (const styleFile of styleFiles) {
      const content = this.styleProcessor.readStyleFile(styleFile, seen);
      if (content.trim()) {
        this.styleProcessor.appendStyleContent(root, content, styleFile);
      }
    }
    if (!root.nodes?.length) return null;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, this.styleProcessor.stringify(root));
    return target;
  }

  private writeExternalStyle(outRoot: string, buildConfig: CssOptions) {
    const target = path.join(
      outRoot,
      this.config.output.styleDir,
      this.config.output.externalCssFile,
    );
    const root = this.styleProcessor.createRoot();

    for (const specifier of this.getGlobalStyleDependencies(buildConfig)) {
      this.styleProcessor.appendImportRule(
        root,
        this.resolver.toExternalStyleSpecifier(specifier, outRoot),
      );
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      root.nodes?.length ? this.styleProcessor.stringify(root) : '',
    );
    return target;
  }

  private getGlobalStyleDependencies(buildConfig: CssOptions) {
    const dependencies: Array<string> = [];
    for (const [packageName, dependency] of Object.entries(
      buildConfig.cssDependencies ?? {},
    )) {
      const globalDependencies = isArray(dependency.global)
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
    const outputs: Array<string> = [];

    for (const sourceDir of sourceDirs) {
      if (sourceDir === '.') continue;

      const dirStyleFiles = styleFilesByDir.get(sourceDir) ?? [];
      const styleDir = path.join(
        outRoot,
        sourceDir,
        this.config.output.styleDir,
      );
      const target = path.join(styleDir, this.config.output.indexCssFile);
      const moduleStyleSpecifiers = this.getModuleStyleSpecifiers(
        moduleStyleImports.get(sourceDir) ?? [],
        styleDir,
      );
      const dirStyleSpecifiers = this.getDirStyleSpecifiers(
        dirStyleFiles,
        importedStyleFiles,
        styleDir,
        outRoot,
      );
      const sourceStyleSpecifiers = [
        ...moduleStyleSpecifiers,
        ...dirStyleSpecifiers,
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
      outputs.push(target);
    }
    return outputs;
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

  private toRelativeImportSpecifier(fromDir: string, file: string) {
    const relative = toPosixPath(path.relative(fromDir, file));
    return relative.startsWith('.') ? relative : `./${relative}`;
  }
}
