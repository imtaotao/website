import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const packageDir = path.join(rootDir, 'packages/kernel-blog');
const packagesDir = path.join(rootDir, 'packages');
const srcDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');
const packageJsonPath = path.join(packageDir, 'package.json');
const issues = [];
const expectedDistFiles = new Set();

const toPosix = (value) => value.split(path.sep).join('/');

const getPackageDirName = (name) => name.replace('@website-kernel/', 'kernel-');

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

const sourceModuleFiles = sourceFiles.filter((file) =>
  /\.(ts|tsx)$/.test(file),
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
  const imports = content.matchAll(/^\s*@import\s+["']([^"']+\.css)["'];/gm);

  for (const match of imports) {
    if (!match[1].startsWith('.')) continue;

    importedCssFiles.add(
      toPosix(
        path.normalize(path.join(path.posix.dirname(sourceFile), match[1])),
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
      const cssFile = path.join(
        packagesDir,
        packageDirName,
        'src/components',
        importedName,
        'index.css',
      );

      if (!existsSync(cssFile)) continue;

      addStyleEntry(
        sourceDir,
        `${packageName}/es/components/${importedName}/style/index.css`,
      );
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
assertJsonValue(packageJson, ['exports', './style/*'], './dist/es/style/*');
assertJsonValue(
  packageJson,
  ['exports', './style.css'],
  './dist/es/style/index.css',
);
assertJsonValue(
  packageJson,
  ['exports', './style/index.css'],
  './dist/es/style/index.css',
);

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

const assertCssIncludes = (relativePath, expectedLines) => {
  const file = path.join(packageDir, relativePath);
  if (!existsSync(file)) return;

  const content = readFileSync(file, 'utf8');
  for (const line of expectedLines) {
    if (!content.includes(line)) {
      addIssue(
        `packages/kernel-blog/${relativePath} is missing expected CSS import: ${line}`,
      );
    }
  }
};

assertCssIncludes('dist/es/style/index.css', [
  '@import "@website-kernel/markdown/es/style/index.css";',
]);
assertCssIncludes('dist/lib/style/index.css', [
  '@import "@website-kernel/markdown/lib/style/index.css";',
]);

for (const [sourceDir, specifiers] of styleEntries) {
  for (const format of ['es', 'lib']) {
    const expectedLines = specifiers.map((specifier) => {
      const outputSpecifier = specifier.startsWith('@website-kernel/')
        ? specifier.replace('/es/', `/${format}/`)
        : specifier;

      return `@import "${outputSpecifier}";`;
    });

    assertCssIncludes(
      `dist/${format}/${sourceDir}/style/index.css`,
      expectedLines,
    );
  }
}

for (const sourceFile of sourceCssFiles) {
  const content = readFileSync(path.join(srcDir, sourceFile), 'utf8');
  const imports = Array.from(
    content.matchAll(/^\s*@import\s+["']([^"']+\.css)["'];/gm),
    (match) => match[0],
  );

  if (!imports.length) continue;

  assertCssIncludes(`dist/es/${sourceFile}`, imports);
  assertCssIncludes(`dist/lib/${sourceFile}`, imports);
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
