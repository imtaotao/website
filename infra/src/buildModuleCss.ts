import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface CssOptions {
  styleDependencies?: Array<string>;
}

const packageRoot = process.cwd();
const srcRoot = path.join(packageRoot, 'src');
const copiedExtensions = new Set(['.css']);

const toPosixPath = (value: string) => value.split(path.sep).join('/');

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

const getCopiedFiles = async () => {
  const files = await walkFiles(srcRoot);
  return files.filter((file) => copiedExtensions.has(path.extname(file)));
};

const loadCssOptions = async (): Promise<CssOptions> => {
  const configPath = path.join(packageRoot, 'css.config.ts');

  try {
    await fs.access(configPath);
  } catch {
    return {};
  }

  const config = await import(pathToFileURL(configPath).href);
  return config.config ?? {};
};

const getPackageDirName = (name: string) =>
  name.replace('@website-kernel/', 'kernel-');

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

const collectModuleStyleImports = async () => {
  const files = await walkFiles(srcRoot);
  const entries = new Map<string, Array<string>>();

  const addEntry = (sourceDir: string, specifier: string) => {
    const values = entries.get(sourceDir) ?? [];
    if (!values.includes(specifier)) values.push(specifier);
    entries.set(sourceDir, values);
  };

  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) continue;

    const sourceDir = path.dirname(path.relative(srcRoot, file));
    const code = await fs.readFile(file, 'utf8');

    const workspaceImports = code.matchAll(
      /^\s*import\s+{([^}]+)}\s+from\s+["'](@website-kernel\/[^"']+)["'];/gm,
    );

    for (const match of workspaceImports) {
      const packageName = match[2];
      const packageDirName = getPackageDirName(packageName);
      const importedNames = match[1]
        .split(',')
        .map((name) =>
          name
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0]
            .trim(),
        )
        .filter(Boolean);

      for (const importedName of importedNames) {
        const cssFile = path.resolve(
          packageRoot,
          '..',
          packageDirName,
          'src/components',
          importedName,
          'index.css',
        );

        try {
          await fs.access(cssFile);
        } catch {
          continue;
        }

        addEntry(
          sourceDir,
          `${packageName}/es/components/${importedName}/style/index.css`,
        );
      }
    }
  }

  return entries;
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
  buildConfig: CssOptions,
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
  buildConfig: CssOptions,
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

const collectImportedCssFiles = async (cssFiles: Array<string>) => {
  const imported = new Set<string>();

  for (const cssFile of cssFiles) {
    const css = await fs.readFile(cssFile, 'utf8');
    const imports = css.matchAll(/^\s*@import\s+["']([^"']+\.css)["'];/gm);

    for (const match of imports) {
      if (!match[1].startsWith('.')) continue;
      imported.add(path.resolve(path.dirname(cssFile), match[1]));
    }
  }

  return imported;
};

const writeComponentStyleEntries = async (
  cssFiles: Array<string>,
  outRoot: string,
  moduleStyleImports: Map<string, Array<string>>,
) => {
  const cssFilesByDir = new Map<string, Array<string>>();
  const importedCssFiles = await collectImportedCssFiles(cssFiles);

  for (const cssFile of cssFiles) {
    const sourceRelative = path.relative(srcRoot, cssFile);
    const sourceDir = path.dirname(sourceRelative);
    const values = cssFilesByDir.get(sourceDir) ?? [];
    values.push(cssFile);
    cssFilesByDir.set(sourceDir, values);
  }

  for (const [sourceDir, dirCssFiles] of cssFilesByDir) {
    const styleDir = path.join(outRoot, sourceDir, 'style');
    const target = path.join(styleDir, 'index.css');
    const moduleStyleSpecifiers = (moduleStyleImports.get(sourceDir) ?? []).map(
      (specifier) => {
        if (specifier.startsWith('@website-kernel/')) return specifier;
        return toPosixPath(
          path.relative(styleDir, path.join(outRoot, specifier)),
        );
      },
    );
    const dirStyleSpecifiers = dirCssFiles
      .filter((cssFile) => !importedCssFiles.has(path.resolve(cssFile)))
      .map((cssFile) =>
        toPosixPath(
          path.relative(
            styleDir,
            path.join(outRoot, path.relative(srcRoot, cssFile)),
          ),
        ),
      );
    const sourceStyleSpecifiers = [
      ...moduleStyleSpecifiers,
      ...dirStyleSpecifiers,
    ];
    const styleImports = sourceStyleSpecifiers
      .filter((specifier, index, specifiers) => {
        return specifiers.indexOf(specifier) === index;
      })
      .map(
        (specifier) =>
          `@import "${toOutputStyleSpecifier(specifier, outRoot)}";`,
      )
      .join('\n');

    if (!styleImports) {
      await fs.rm(target, { force: true });
      continue;
    }

    await fs.mkdir(styleDir, { recursive: true });
    await fs.writeFile(target, `${styleImports}\n`);
  }
};

const copiedFiles = await getCopiedFiles();
const cssOptions = await loadCssOptions();
const moduleStyleImports = await collectModuleStyleImports();

await writePackageStyles(copiedFiles, cssOptions);
await copyStaticFiles(copiedFiles, path.join(packageRoot, 'dist/es'));
await copyStaticFiles(copiedFiles, path.join(packageRoot, 'dist/lib'));
await writeEntryStyle(
  copiedFiles,
  path.join(packageRoot, 'dist/es'),
  cssOptions,
);
await writeEntryStyle(
  copiedFiles,
  path.join(packageRoot, 'dist/lib'),
  cssOptions,
);
await writeComponentStyleEntries(
  copiedFiles,
  path.join(packageRoot, 'dist/es'),
  moduleStyleImports,
);
await writeComponentStyleEntries(
  copiedFiles,
  path.join(packageRoot, 'dist/lib'),
  moduleStyleImports,
);
