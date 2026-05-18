import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';
import { moduleCssBuildConfig } from '#infra/css/config';

describe('ModuleCssBuilder', () => {
  let tempRoot: string;

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  const readFile = (relativePath: string) => {
    return fs.readFileSync(path.join(tempRoot, relativePath), 'utf8');
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-builder-'));
    writeFile('package.json', JSON.stringify({ name: 'fixture-package' }));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('builds package, format and module CSS entries', async () => {
    writeFile(
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        imports: {
          '#fixture/*': './source/*.js',
        },
      }),
    );
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
          cssDependencies: {
            '@scope/ui': {
              global: '/style.css',
              component: ['/pages/**.css', '/components/**.css'],
            },
          },
        };
      `,
    );
    writeFile(
      'node_modules/@scope/ui/style.css',
      `
        @import "./tokens.css";
        .external { color: blue; }
      `,
    );
    writeFile('node_modules/@scope/ui/tokens.css', '.token { color: green; }');
    writeFile('node_modules/@scope/ui/components/Button.css', '');
    writeFile(
      'source/components/Card/index.tsx',
      `
        import { Button } from '@scope/ui';
        import { Badge } from '#fixture/components/Badge';
        export const Card = () => null;
      `,
    );
    writeFile(
      'source/components/Badge/index.tsx',
      'export const Badge = () => null;',
    );
    writeFile(
      'source/components/Card/index.css',
      `
        @import "./tokens.css";
        .card { color: red; }
      `,
    );
    writeFile(
      'source/components/Card/tokens.css',
      '.card-token { margin: 0; }',
    );
    writeFile('source/components/Badge/index.css', '.badge { color: pink; }');

    await createBuilder().build();

    expect(readFile('output/index.css')).toContain('.token { color: green; }');
    expect(readFile('output/index.css')).toContain(
      '.external { color: blue; }',
    );
    expect(readFile('output/index.css')).toContain(
      '.card-token { margin: 0; }',
    );
    expect(readFile('output/index.css')).toContain('.card { color: red; }');
    expect(readFile('output/es/components/Card/index.css')).toContain('.card');
    expect(readFile('output/lib/components/Card/index.css')).toContain('.card');
    expect(readFile('output/es/components/Card/style/index.css')).toBe(
      '@import "@scope/ui/components/Button.css";\n' +
        '@import "../../Badge/style/index.css";\n' +
        '@import "../index.css";\n',
    );
    expect(readFile('output/lib/components/Card/style/index.css')).toBe(
      '@import "@scope/ui/components/Button.css";\n' +
        '@import "../../Badge/style/index.css";\n' +
        '@import "../index.css";\n',
    );
    expect(readFile('output/es/style/external.css')).toBe(
      '@import "@scope/ui/external.css";\n',
    );
    expect(readFile('output/es/style/index.css')).toContain(
      '@import "./external.css";',
    );
    expect(readFile('output/es/style/index.css')).toContain(
      '@import "./module.css";',
    );
    expect(readFile('output/es/style/module.css')).toContain(
      '.card { color: red; }',
    );
    expect(readFile('output/lib/style/index.css')).toContain(
      '@import "./external.css";',
    );
    expect(
      fs.existsSync(
        path.join(tempRoot, 'output/es/components/Card/tokens/style/index.css'),
      ),
    ).toBe(false);
  });

  test('rewrites legacy output-format package style imports per format', async () => {
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
          cssDependencies: {
            '@scope/ui': {
              global: '/es/style/index.css',
            },
          },
        };
      `,
    );
    writeFile('node_modules/@scope/ui/es/style/index.css', '.esm {}');
    writeFile('node_modules/@scope/ui/lib/style/index.css', '.cjs {}');
    writeFile('source/index.css', '.local {}');

    await createBuilder().build();

    expect(readFile('output/es/style/external.css')).toBe(
      '@import "@scope/ui/es/style/external.css";\n',
    );
    expect(readFile('output/lib/style/external.css')).toBe(
      '@import "@scope/ui/lib/style/external.css";\n',
    );
    expect(readFile('output/es/style/index.css')).toBe(
      '@import "./external.css";\n@import "./module.css";\n',
    );
    expect(readFile('output/es/style/module.css')).toBe('.local {}\n');
  });

  test('builds same-package module CSS entries without cssDependencies', async () => {
    writeFile(
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        imports: {
          '#fixture/*': './source/*.js',
        },
      }),
    );
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
        };
      `,
    );
    writeFile(
      'source/components/Renderer/index.tsx',
      `
        import { CodeBlock } from '#fixture/components/CodeBlock';
        export const Renderer = () => null;
      `,
    );
    writeFile(
      'source/components/CodeBlock/index.tsx',
      'export const CodeBlock = () => null;',
    );
    writeFile('source/components/Renderer/index.css', '.renderer {}');
    writeFile('source/components/CodeBlock/index.css', '.code-block {}');

    await createBuilder().build();

    expect(readFile('output/es/components/Renderer/style/index.css')).toBe(
      '@import "../../CodeBlock/style/index.css";\n' +
        '@import "../index.css";\n',
    );
    expect(readFile('output/lib/components/Renderer/style/index.css')).toBe(
      '@import "../../CodeBlock/style/index.css";\n' +
        '@import "../index.css";\n',
    );
    expect(readFile('output/es/style/external.css')).toBe('');
    expect(readFile('output/es/style/index.css')).toBe(
      '@import "./external.css";\n@import "./module.css";\n',
    );
  });

  test('builds module CSS entries for source modules without own CSS', async () => {
    writeFile(
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        imports: {
          '#fixture/*': './source/*.js',
        },
      }),
    );
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
        };
      `,
    );
    writeFile(
      'source/components/Renderer/index.tsx',
      `
        import { CodeBlock } from '#fixture/components/CodeBlock';
        export const Renderer = () => null;
      `,
    );
    writeFile(
      'source/components/CodeBlock/index.tsx',
      'export const CodeBlock = () => null;',
    );
    writeFile('source/components/CodeBlock/index.css', '.code-block {}');

    await createBuilder().build();

    expect(readFile('output/es/components/Renderer/style/index.css')).toBe(
      '@import "../../CodeBlock/style/index.css";\n',
    );
  });

  test('builds same-name style entries for flat source modules', async () => {
    writeFile(
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        imports: {
          '#fixture/*': './source/*.js',
        },
      }),
    );
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
        };
      `,
    );
    writeFile(
      'source/components/Renderer.tsx',
      `
        import { Button } from '#fixture/components/Button';
        export const Renderer = () => null;
      `,
    );
    writeFile(
      'source/components/Button.tsx',
      'export const Button = () => null;',
    );
    writeFile('source/components/Button.css', '.button {}');

    await createBuilder().build();

    expect(readFile('output/es/components/Renderer/style/index.css')).toBe(
      '@import "../../Button/style/index.css";\n',
    );
    expect(readFile('output/es/components/Button/style/index.css')).toBe(
      '@import "../../Button.css";\n',
    );
  });

  const createBuilder = () => {
    return new ModuleCssBuilder(
      {
        packageRoot: tempRoot,
      },
      {
        ...moduleCssBuildConfig,
        cssConfigFile: 'css.config.mjs',
      },
    );
  };
});
