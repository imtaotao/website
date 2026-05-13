import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

type PackageJson = {
  dependencies?: Record<string, string>;
  imports?: Record<string, string>;
};

type PackageBuildConfig = {
  styleDependencies?: Array<string>;
  componentStyleDependencies?: Record<string, string | Array<string>>;
};

type AliasResolver = {
  alias: string;
  aliasPrefix: string;
  aliasSuffix: string;
  hasStar: boolean;
  targetPrefix: string;
  targetSuffix: string;
};

const packageRoot = process.cwd();
const srcRoot = path.join(packageRoot, 'src');
const tsExtensions = new Set(['.ts', '.tsx']);
const copiedExtensions = new Set(['.css']);

const toPosixPath = (value: string) => value.split(path.sep).join('/');

const ensureRelativeSpecifier = (value: string) => {
  return value.startsWith('.') ? value : `./${value}`;
};

const stripKnownExtension = (value: string) => {
  return value.replace(/\.(ts|tsx|js|jsx)$/, '');
};

const replaceJsExtension = (value: string) => {
  return value.replace(/\.(ts|tsx|jsx)$/, '.js');
};

const isSourceFile = async (file: string) => {
  try {
    const stat = await fs.stat(file);
    return stat.isFile();
  } catch {
    return false;
  }
};

const normalizeSourceTarget = async (sourceTarget: string) => {
  if (await isSourceFile(sourceTarget)) return sourceTarget;

  for (const extension of ['.ts', '.tsx', '.js', '.jsx']) {
    const candidate = `${sourceTarget}${extension}`;
    if (await isSourceFile(candidate)) return candidate;
  }

  for (const extension of ['.ts', '.tsx', '.js', '.jsx']) {
    const candidate = path.join(sourceTarget, `index${extension}`);
    if (await isSourceFile(candidate)) return candidate;
  }

  return sourceTarget;
};

const walkFiles = async (dir: string): Promise<Array<string>> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '__tests__') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (/\.(spec|test)\.(ts|tsx)$/.test(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
};

const getSourceFiles = async () => {
  const files = await walkFiles(srcRoot);
  return files.filter(
    (file) => tsExtensions.has(path.extname(file)) && !file.endsWith('.d.ts'),
  );
};

const getCopiedFiles = async () => {
  const files = await walkFiles(srcRoot);
  return files.filter((file) => copiedExtensions.has(path.extname(file)));
};

const cleanupSourceDeclarations = async () => {
  const files = await walkFiles(srcRoot);
  await Promise.all(
    files
      .filter((file) => file.endsWith('.d.ts'))
      .map((file) => fs.rm(file, { force: true })),
  );
};

const loadPackageJson = async (): Promise<PackageJson> => {
  const content = await fs.readFile(
    path.join(packageRoot, 'package.json'),
    'utf8',
  );
  return JSON.parse(content);
};

const loadPackageBuildConfig = async (): Promise<PackageBuildConfig> => {
  const configPath = path.join(packageRoot, 'tsup.config.ts');

  try {
    await fs.access(configPath);
  } catch {
    return {};
  }

  const config = await import(pathToFileURL(configPath).href);
  return config.packageBuild ?? {};
};

const getPackageDirName = (name: string) =>
  name.replace('@website-kernel/', 'kernel-');

const createCompilerPaths = (
  pkg: PackageJson,
  basePaths: ts.CompilerOptions['paths'] = {},
) => {
  const paths: NonNullable<ts.CompilerOptions['paths']> = { ...basePaths };

  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (!name.startsWith('@website-kernel/')) continue;

    const packageDirName = getPackageDirName(name);
    paths[name] = [`packages/${packageDirName}/dist/es/index.d.ts`];
    paths[`${name}/*`] = [`packages/${packageDirName}/dist/es/*`];
  }

  return paths;
};

const createAliasResolvers = (pkg: PackageJson): Array<AliasResolver> => {
  return Object.entries(pkg.imports ?? {})
    .map(([alias, target]) => {
      if (!target.startsWith('./src/')) return undefined;
      const hasStar = alias.includes('*');
      const [aliasPrefix, aliasSuffix = ''] = alias.split('*');
      const [targetPrefix, targetSuffix = ''] = target.split('*');

      return {
        alias,
        aliasPrefix,
        aliasSuffix,
        hasStar,
        targetPrefix,
        targetSuffix,
      };
    })
    .filter((value): value is AliasResolver => Boolean(value));
};

const resolveAliasToSource = (
  specifier: string,
  resolvers: Array<AliasResolver>,
) => {
  for (const resolver of resolvers) {
    if (!resolver.hasStar && specifier === resolver.alias) {
      return resolver.targetPrefix;
    }

    if (
      resolver.hasStar &&
      specifier.startsWith(resolver.aliasPrefix) &&
      specifier.endsWith(resolver.aliasSuffix)
    ) {
      const matched = specifier.slice(
        resolver.aliasPrefix.length,
        specifier.length - resolver.aliasSuffix.length,
      );
      return `${resolver.targetPrefix}${matched}${resolver.targetSuffix}`;
    }
  }

  return undefined;
};

const createSpecifierRewriter = (
  resolvers: Array<AliasResolver>,
  outRoot: string,
) => {
  return async (code: string, sourceFile: string) => {
    const sourceDir = path.dirname(sourceFile);

    const rewriteSpecifier = async (specifier: string) => {
      const resolved = resolveAliasToSource(specifier, resolvers);
      if (!resolved) return specifier;

      const sourceTarget = await normalizeSourceTarget(
        path.resolve(packageRoot, resolved),
      );
      const sourceRelative = path.relative(srcRoot, sourceTarget);
      const outputTarget = path.join(
        outRoot,
        replaceJsExtension(sourceRelative),
      );
      const outputFrom = path.join(outRoot, path.relative(srcRoot, sourceDir));
      const relative = toPosixPath(path.relative(outputFrom, outputTarget));
      const withExtension = path.extname(relative)
        ? relative
        : `${stripKnownExtension(relative)}.js`;

      return ensureRelativeSpecifier(withExtension);
    };

    const rewriteMatches = async (source: string, pattern: RegExp) => {
      const matches = [...source.matchAll(pattern)];
      let rewritten = '';
      let cursor = 0;

      for (const match of matches) {
        rewritten += source.slice(cursor, match.index);
        const [, prefix, quote, specifier] = match;
        rewritten += `${prefix}${quote}${await rewriteSpecifier(
          specifier,
        )}${quote}`;
        cursor = match.index + match[0].length;
      }

      return `${rewritten}${source.slice(cursor)}`;
    };

    const importFromRewritten = await rewriteMatches(
      code,
      /(from\s*|import\s*\(\s*|require\(\s*)(['"])([^'"]+)\2/g,
    );

    return rewriteMatches(importFromRewritten, /(import\s+)(['"])([^'"]+)\2/g);
  };
};

const compileJavaScript = async (
  files: Array<string>,
  outRoot: string,
  moduleKind: ts.ModuleKind,
) => {
  const pkg = await loadPackageJson();
  const rewriteSpecifiers = createSpecifierRewriter(
    createAliasResolvers(pkg),
    outRoot,
  );

  for (const sourceFile of files) {
    const source = await fs.readFile(sourceFile, 'utf8');
    let output;
    try {
      output = ts.transpileModule(source, {
        fileName: sourceFile,
        compilerOptions: {
          target: ts.ScriptTarget.ES2018,
          module: moduleKind,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          importHelpers: false,
          sourceMap: false,
        },
      }).outputText;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to compile ${sourceFile}: ${message}`);
    }

    const relative = path
      .relative(srcRoot, sourceFile)
      .replace(/\.(ts|tsx)$/, '.js');
    const target = path.join(outRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, await rewriteSpecifiers(output, sourceFile));
  }
};

const emitDeclarations = async (files: Array<string>, outRoot: string) => {
  const configPath = path.resolve(packageRoot, '../../tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'),
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );
  const pkg = await loadPackageJson();

  const options = {
    ...parsed.options,
    baseUrl: path.dirname(configPath),
    paths: createCompilerPaths(pkg, parsed.options.paths),
    rootDir: srcRoot,
    outDir: outRoot,
    declarationDir: outRoot,
    declaration: true,
    emitDeclarationOnly: true,
    module: ts.ModuleKind.ESNext,
    noEmit: false,
    noEmitOnError: false,
    declarationMap: false,
    allowArbitraryExtensions: true,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  };
  const program = ts.createProgram(files, options);
  const result = program.emit();

  if (result.emitSkipped) {
    throw new Error(`Failed to emit declarations for ${packageRoot}.`);
  }

  const declarationFiles = (await walkFiles(outRoot)).filter((file) =>
    file.endsWith('.d.ts'),
  );
  const rewriteSpecifiers = createSpecifierRewriter(
    createAliasResolvers(pkg),
    outRoot,
  );

  for (const file of declarationFiles) {
    const sourceFile = path.join(
      srcRoot,
      path.relative(outRoot, file).replace(/\.d\.ts$/, '.ts'),
    );
    const content = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, await rewriteSpecifiers(content, sourceFile));
  }
};

const copyStaticFiles = async (files: Array<string>, outRoot: string) => {
  for (const sourceFile of files) {
    const relative = path.relative(srcRoot, sourceFile);
    const target = path.join(outRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(sourceFile, target);
  }
};

const resolveWorkspaceStyleImport = (specifier: string) => {
  if (!specifier.startsWith('@website-kernel/')) return undefined;

  const [packageName, ...rest] = specifier.split('/');
  const scopedPackageName = `${packageName}/${rest.shift() ?? ''}`;
  const packageDirName = getPackageDirName(scopedPackageName);
  const stylePath = rest.join('/');

  if (stylePath === 'style.css' || stylePath === 'style/index.css') {
    return path.resolve(packageRoot, '..', packageDirName, 'dist/index.css');
  }

  if (stylePath.startsWith('style/')) {
    return path.resolve(
      packageRoot,
      '..',
      packageDirName,
      'dist/es',
      stylePath,
    );
  }

  return undefined;
};

const resolveStyleDependency = (specifier: string) => {
  const workspacePath = resolveWorkspaceStyleImport(specifier);
  if (workspacePath) return workspacePath;

  return path.resolve(packageRoot, 'node_modules', specifier);
};

const toOutputStyleSpecifier = (specifier: string, outRoot: string) => {
  if (!specifier.startsWith('@website-kernel/')) return specifier;

  const [packageName, ...rest] = specifier.split('/');
  const scopedPackageName = `${packageName}/${rest.shift() ?? ''}`;
  const stylePath = rest.join('/');
  const currentOutputFormat = path.basename(outRoot);

  if (stylePath === 'style.css' || stylePath === 'style/index.css') {
    return `${scopedPackageName}/${currentOutputFormat}/style/index.css`;
  }

  if (stylePath.startsWith('es/')) {
    return `${scopedPackageName}/${currentOutputFormat}/${stylePath.slice(3)}`;
  }

  if (stylePath.startsWith('lib/')) {
    return `${scopedPackageName}/${currentOutputFormat}/${stylePath.slice(4)}`;
  }

  return specifier;
};

const readStyleFile = async (
  cssPath: string,
  seen = new Set<string>(),
): Promise<string> => {
  try {
    await fs.access(cssPath);
  } catch {
    return '';
  }

  const normalizedPath = path.resolve(cssPath);
  if (seen.has(normalizedPath)) return '';
  seen.add(normalizedPath);

  const css = await fs.readFile(cssPath, 'utf8');
  const inlined = await Promise.all(
    css.split('\n').map(async (line) => {
      const match = line.match(/^\s*@import\s+["']([^"']+)["'];\s*$/);
      if (!match) return line;

      const importedPath = resolveStyleDependency(match[1]);
      if (!importedPath) return line;

      return readStyleFile(importedPath, seen);
    }),
  );

  return inlined.join('\n');
};

const writePackageStyles = async (
  cssFiles: Array<string>,
  buildConfig: PackageBuildConfig,
) => {
  const seen = new Set<string>();
  const sections: Array<string> = [];

  for (const specifier of buildConfig.styleDependencies ?? []) {
    const cssPath = resolveStyleDependency(specifier);
    if (!cssPath) continue;

    const content = await readStyleFile(cssPath, seen);
    if (content.trim()) sections.push(content);
  }

  for (const cssFile of cssFiles) {
    const content = await readStyleFile(cssFile, seen);
    if (content.trim()) sections.push(content);
  }

  if (!sections.length) return;

  await fs.writeFile(
    path.join(packageRoot, 'dist/index.css'),
    `${sections.join('\n')}\n`,
  );
};

const writeEntryStyle = async (
  cssFiles: Array<string>,
  outRoot: string,
  buildConfig: PackageBuildConfig,
) => {
  const target = path.join(outRoot, 'style/index.css');
  const seen = new Set<string>();
  const sections: Array<string> = [];

  for (const specifier of buildConfig.styleDependencies ?? []) {
    sections.push(`@import "${toOutputStyleSpecifier(specifier, outRoot)}";`);
  }

  for (const cssFile of cssFiles) {
    const content = await readStyleFile(cssFile, seen);
    if (content.trim()) sections.push(content);
  }

  if (!sections.length) return;

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${sections.join('\n')}\n`);
};

const normalizeComponentStyleDependencies = (
  buildConfig: PackageBuildConfig,
) => {
  const config = buildConfig.componentStyleDependencies ?? {};
  const entries = new Map<string, Array<string>>();

  for (const [key, value] of Object.entries(config)) {
    const normalizedKey = key.replace(/\\/g, '/').replace(/^src\//, '');
    entries.set(normalizedKey, Array.isArray(value) ? value : [value]);
  }

  return entries;
};

const writeComponentStyleEntries = async (
  cssFiles: Array<string>,
  outRoot: string,
  buildConfig: PackageBuildConfig,
) => {
  const componentStyleDependencies =
    normalizeComponentStyleDependencies(buildConfig);

  for (const cssFile of cssFiles) {
    const sourceRelative = path.relative(srcRoot, cssFile);
    const sourceDir = path.dirname(sourceRelative);
    const styleDir = path.join(outRoot, sourceDir, 'style');
    const target = path.join(styleDir, 'index.css');
    const cssRelative = toPosixPath(
      path.relative(styleDir, path.join(outRoot, sourceRelative)),
    );
    const styleImports = [
      ...(componentStyleDependencies.get(sourceDir) ?? []),
      `../${path.basename(cssRelative)}`,
    ]
      .map(
        (specifier) =>
          `@import "${toOutputStyleSpecifier(specifier, outRoot)}";`,
      )
      .join('\n');

    await fs.mkdir(styleDir, { recursive: true });
    await fs.writeFile(target, `${styleImports}\n`);
  }
};

await cleanupSourceDeclarations();
await fs.rm(path.join(packageRoot, 'dist/es'), {
  recursive: true,
  force: true,
});
await fs.rm(path.join(packageRoot, 'dist/lib'), {
  recursive: true,
  force: true,
});

const sourceFiles = await getSourceFiles();
const copiedFiles = await getCopiedFiles();
const packageBuildConfig = await loadPackageBuildConfig();

await writePackageStyles(copiedFiles, packageBuildConfig);
await compileJavaScript(
  sourceFiles,
  path.join(packageRoot, 'dist/es'),
  ts.ModuleKind.ESNext,
);
await compileJavaScript(
  sourceFiles,
  path.join(packageRoot, 'dist/lib'),
  ts.ModuleKind.CommonJS,
);
await emitDeclarations(sourceFiles, path.join(packageRoot, 'dist/es'));
await emitDeclarations(sourceFiles, path.join(packageRoot, 'dist/lib'));
await copyStaticFiles(copiedFiles, path.join(packageRoot, 'dist/es'));
await copyStaticFiles(copiedFiles, path.join(packageRoot, 'dist/lib'));
await writeEntryStyle(
  copiedFiles,
  path.join(packageRoot, 'dist/es'),
  packageBuildConfig,
);
await writeEntryStyle(
  copiedFiles,
  path.join(packageRoot, 'dist/lib'),
  packageBuildConfig,
);
await writeComponentStyleEntries(
  copiedFiles,
  path.join(packageRoot, 'dist/es'),
  packageBuildConfig,
);
await writeComponentStyleEntries(
  copiedFiles,
  path.join(packageRoot, 'dist/lib'),
  packageBuildConfig,
);
await cleanupSourceDeclarations();
await new Promise((resolve) => setTimeout(resolve, 100));
await cleanupSourceDeclarations();
