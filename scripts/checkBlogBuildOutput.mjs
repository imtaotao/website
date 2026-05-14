import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const rootDir = process.cwd();
const infraRequire = createRequire(path.join(rootDir, 'infra/package.json'));
const postcss = infraRequire('postcss');
const packageDir = path.join(rootDir, 'packages/kernel-blog');
const packagesDir = path.join(rootDir, 'packages');
const srcDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');
const packageJsonPath = path.join(packageDir, 'package.json');
const issues = [];
const expectedDistFiles = new Set();
const componentCssDependencies = {
  '@website-kernel': '/*/es/components/**/style/index.css',
};

const toPosix = (value) => value.split(path.sep).join('/');
const packageRelativeDir = toPosix(path.relative(rootDir, packageDir));

const getPackageDirName = (name) => name.replace('@website-kernel/', 'kernel-');

const parseCssImportSpecifier = (params) => {
  const value = params.trim();
  const first = value[0];

  if (first === '"' || first === "'") {
    const end = value.indexOf(first, 1);
    return end > 0 ? value.slice(1, end) : null;
  }

  if (!value.startsWith('url(')) {
    return null;
  }

  const end = value.indexOf(')', 4);
  if (end < 0) return null;

  const url = value.slice(4, end).trim();
  const quote = url[0];

  if (quote === '"' || quote === "'") {
    const quoteEnd = url.indexOf(quote, 1);
    return quoteEnd > 0 ? url.slice(1, quoteEnd) : null;
  }

  return url || null;
};

const getCssImportSpecifiers = (relativePath, content) => {
  const root = postcss.parse(content, {
    from: path.join(packageDir, relativePath),
  });
  const specifiers = [];

  root.walkAtRules('import', (rule) => {
    const specifier = parseCssImportSpecifier(rule.params);
    if (specifier) specifiers.push(specifier);
  });

  return specifiers;
};

const getPackageNameParts = (specifier) => {
  const parts = specifier.split('/');
  if (specifier.startsWith('@'))
    return [parts.slice(0, 2).join('/'), parts.slice(2)];
  return [parts[0], parts.slice(1)];
};

const getImportDeclarations = (sourceFile, code) => {
  const parsed = ts.createSourceFile(
    sourceFile,
    code,
    ts.ScriptTarget.Latest,
    false,
    sourceFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];

  parsed.forEachChild((node) => {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return;
    }

    imports.push({
      importPath: node.moduleSpecifier.text,
      importClause: node.importClause,
    });
  });

  return imports;
};

const getImportedNames = (sourceFile, item) => {
  const importClause = item.importClause;
  if (!importClause || importClause.isTypeOnly) return [];

  const names = [];
  if (importClause.name) names.push(importClause.name.text);

  const namedBindings = importClause.namedBindings;
  if (!namedBindings) return names;

  if (ts.isNamespaceImport(namedBindings)) {
    addIssue(
      `unsupported namespace import for CSS auto import: ${item.importPath}. ` +
        `file: ${packageRelativeDir}/src/${sourceFile}. ` +
        `use named imports instead, for example: import { Component } from '${item.importPath}'.`,
    );
    return [];
  }

  for (const element of namedBindings.elements) {
    if (element.isTypeOnly) continue;
    names.push((element.propertyName ?? element.name).text);
  }

  return names;
};

const joinDependencySpecifier = (packageName, dependencyPath) => {
  if (!dependencyPath) return packageName;
  if (dependencyPath.startsWith('/')) return `${packageName}${dependencyPath}`;
  return `${packageName}/${dependencyPath}`;
};

const getImportPathValues = (packageName, importPath) =>
  importPath
    .slice(packageName.length)
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);

const createStyleSpecifier = (outputPattern, values, importedName) => {
  const pathValues = [...values];

  return outputPattern.replace(/\*\*|\*/g, (token) => {
    const matchedValue = pathValues.shift();
    if (matchedValue) return matchedValue;
    if (token === '**') return importedName;
    return matchedValue ?? importedName;
  });
};

const createDirectStyleSpecifier = (outputPattern, importPath) => {
  const patternParts = outputPattern.split('/');
  const globstarIndex = patternParts.indexOf('**');

  if (globstarIndex < 0) return null;

  const prefixParts = patternParts.slice(0, globstarIndex);
  const suffixParts = patternParts.slice(globstarIndex + 1);
  const importParts = importPath.split('/');

  if (importParts.length < prefixParts.length) return null;

  for (let index = 0; index < prefixParts.length; index += 1) {
    const patternPart = prefixParts[index];
    if (patternPart === '*') continue;
    if (patternPart !== importParts[index]) return null;
  }

  return [...importParts, ...suffixParts].join('/');
};

const resolvePackageStyleFile = (specifier) => {
  const [packageName, packagePath] = getPackageNameParts(specifier);
  const packageDirName = getPackageDirName(packageName);
  return path.join(packagesDir, packageDirName, 'dist', ...packagePath);
};

const addIssue = (message) => {
  issues.push(message);
};

const assertFile = (relativePath) => {
  if (relativePath.startsWith('dist/')) {
    expectedDistFiles.add(relativePath.slice('dist/'.length));
  }

  const file = path.join(packageDir, relativePath);
  if (!existsSync(file)) {
    addIssue(`missing file: packages/kernel-blog/${relativePath}`);
  }
};

const assertJsonValue = (object, keyPath, expected) => {
  const pathParts = Array.isArray(keyPath) ? keyPath : [keyPath];
  const actual = pathParts.reduce((value, key) => value?.[key], object);
  const label = pathParts.join('.');

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    addIssue(
      `package.json ${label} expected ${JSON.stringify(
        expected,
      )}, got ${JSON.stringify(actual)}`,
    );
  }
};

const readFiles = (dir) => {
  const files = [];

  const walk = (currentDir) => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      files.push(absolute);
    }
  };

  walk(dir);
  return files;
};

const sourceFiles = readFiles(srcDir)
  .map((file) => toPosix(path.relative(srcDir, file)))
  .filter((file) => !file.startsWith('__tests__/'))
  .sort();

const sourceModuleFiles = sourceFiles.filter(
  (file) => /\.(ts|tsx)$/.test(file) && !/\.d\.[cm]?ts$/.test(file),
);
const sourceCssFiles = sourceFiles.filter((file) => file.endsWith('.css'));
const sourceCssFileSet = new Set(sourceCssFiles);
const importedCssFiles = new Set();
const styleEntries = new Map();

const addStyleEntry = (sourceDir, specifier) => {
  const values = styleEntries.get(sourceDir) ?? [];
  if (!values.includes(specifier)) values.push(specifier);
  styleEntries.set(sourceDir, values);
};

for (const sourceFile of sourceCssFiles) {
  const content = readFileSync(path.join(srcDir, sourceFile), 'utf8');
  const imports = getCssImportSpecifiers(sourceFile, content);

  for (const specifier of imports) {
    if (!specifier.startsWith('.')) continue;

    importedCssFiles.add(
      toPosix(
        path.normalize(path.join(path.posix.dirname(sourceFile), specifier)),
      ),
    );
  }
}

for (const sourceFile of sourceModuleFiles) {
  const sourceDir = path.posix.dirname(sourceFile);
  const outputBase = sourceFile.replace(/\.(ts|tsx)$/, '');
  const sameNameCss = `${outputBase}.css`;

  if (sourceCssFileSet.has(sameNameCss)) {
    addStyleEntry(
      sourceDir,
      toPosix(path.posix.relative(`${sourceDir}/style`, sameNameCss)),
    );
  }

  const code = readFileSync(path.join(srcDir, sourceFile), 'utf8');
  const imports = getImportDeclarations(sourceFile, code);

  for (const item of imports) {
    for (const [packagePrefix, dependencyPath] of Object.entries(
      componentCssDependencies,
    )) {
      if (
        item.importPath !== packagePrefix &&
        !item.importPath.startsWith(`${packagePrefix}/`)
      ) {
        continue;
      }

      const outputPattern = joinDependencySpecifier(
        packagePrefix,
        dependencyPath,
      );
      const directSpecifier = createDirectStyleSpecifier(
        outputPattern,
        item.importPath,
      );

      if (directSpecifier) {
        const cssFile = resolvePackageStyleFile(directSpecifier);

        if (existsSync(cssFile)) {
          addStyleEntry(sourceDir, directSpecifier);
        }

        continue;
      }

      const importedNames = getImportedNames(sourceFile, item);
      const values = getImportPathValues(packagePrefix, item.importPath);

      for (const importedName of importedNames.length ? importedNames : ['']) {
        const specifier = createStyleSpecifier(
          outputPattern,
          values,
          importedName,
        );
        const cssFile = resolvePackageStyleFile(specifier);

        if (!existsSync(cssFile)) continue;

        addStyleEntry(sourceDir, specifier);
      }
    }
  }
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

assertJsonValue(packageJson, 'main', './dist/lib/index.js');
assertJsonValue(packageJson, 'module', './dist/es/index.js');
assertJsonValue(packageJson, 'unpkg', './dist/index.global.js');
assertJsonValue(packageJson, 'types', './dist/es/index.d.ts');
assertJsonValue(packageJson, 'files', ['dist']);
assertJsonValue(packageJson, 'sideEffects', ['**/*.css']);
assertJsonValue(packageJson, ['exports', '.'], {
  import: {
    types: './dist/es/index.d.ts',
    default: './dist/es/index.js',
  },
  require: {
    types: './dist/lib/index.d.ts',
    default: './dist/lib/index.js',
  },
});
assertJsonValue(packageJson, ['exports', './es/*'], './dist/es/*');
assertJsonValue(packageJson, ['exports', './lib/*'], './dist/lib/*');
assertJsonValue(packageJson, ['exports', './style.css'], './dist/index.css');

for (const file of [
  'dist/index.js',
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/index.global.js',
  'dist/index.css',
]) {
  assertFile(file);
}

for (const format of ['es', 'lib']) {
  for (const sourceFile of sourceModuleFiles) {
    const outputBase = sourceFile.replace(/\.(ts|tsx)$/, '');
    assertFile(`dist/${format}/${outputBase}.js`);
    assertFile(`dist/${format}/${outputBase}.d.ts`);
  }

  for (const sourceFile of sourceCssFiles) {
    assertFile(`dist/${format}/${sourceFile}`);

    if (importedCssFiles.has(sourceFile)) continue;

    const sourceDir = path.posix.dirname(sourceFile);
    if (styleEntries.has(sourceDir)) {
      assertFile(`dist/${format}/${sourceDir}/style/index.css`);
    }
  }

  for (const sourceDir of styleEntries.keys()) {
    assertFile(`dist/${format}/${sourceDir}/style/index.css`);
  }

  assertFile(`dist/${format}/style/index.css`);
}

const assertCssImports = (relativePath, expectedSpecifiers) => {
  const file = path.join(packageDir, relativePath);
  if (!existsSync(file)) return;

  const content = readFileSync(file, 'utf8');
  const imports = getCssImportSpecifiers(relativePath, content);

  for (const specifier of expectedSpecifiers) {
    if (!imports.includes(specifier)) {
      addIssue(
        `packages/kernel-blog/${relativePath} is missing expected CSS import: ${specifier}`,
      );
    }
  }
};

assertCssImports('dist/es/style/index.css', [
  '@website-kernel/markdown/style.css',
]);
assertCssImports('dist/lib/style/index.css', [
  '@website-kernel/markdown/style.css',
]);

for (const [sourceDir, specifiers] of styleEntries) {
  for (const format of ['es', 'lib']) {
    const expectedSpecifiers = specifiers.map((specifier) =>
      specifier.startsWith('@website-kernel/')
        ? specifier.replace('/es/', `/${format}/`)
        : specifier,
    );

    assertCssImports(
      `dist/${format}/${sourceDir}/style/index.css`,
      expectedSpecifiers,
    );
  }
}

for (const sourceFile of sourceCssFiles) {
  const content = readFileSync(path.join(srcDir, sourceFile), 'utf8');
  const imports = getCssImportSpecifiers(sourceFile, content);

  if (!imports.length) continue;

  assertCssImports(`dist/es/${sourceFile}`, imports);
  assertCssImports(`dist/lib/${sourceFile}`, imports);
}

if (!existsSync(distDir)) {
  addIssue('missing directory: packages/kernel-blog/dist');
} else {
  const actualDistFiles = readFiles(distDir)
    .map((file) => toPosix(path.relative(distDir, file)))
    .sort();

  for (const file of actualDistFiles) {
    if (!expectedDistFiles.has(file)) {
      addIssue(`unexpected dist file: packages/kernel-blog/dist/${file}`);
    }
  }
}

if (issues.length > 0) {
  console.error('Blog build output check failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Blog build output check passed: ${sourceModuleFiles.length} module source(s), ${sourceCssFiles.length} CSS source(s)`,
);
