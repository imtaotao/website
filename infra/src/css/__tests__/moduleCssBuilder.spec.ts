import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';
import { moduleCssBuildConfig } from '#infra/css/core/config';
import { createCssTestFixture, type CssTestFixture } from './cssTestFixture';

describe('ModuleCssBuilder', () => {
  let fixture: CssTestFixture;

  beforeEach(() => {
    fixture = createCssTestFixture('infra-builder-');
    writeFile('package.json', JSON.stringify({ name: 'fixture-package' }));
  });

  afterEach(() => {
    fixture.cleanup();
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
          themes: {
            light: './source/themes/light.css',
            dark: './source/themes/dark.css',
          },
          cssDependencies: {
            '@website-kernel/markdown': {
              global: '/style.css',
              themes: {
                light: '/themes/light.css',
                dark: '/themes/dark.css',
              },
            },
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
    writeFile('source/themes/light.css', ':root { --color: white; }');
    writeFile(
      'source/themes/dark.css',
      ':root[data-theme="dark"] { --color: black; }',
    );
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

    expect(listFiles('output')).toEqual([
      'es/components/Badge/index.css',
      'es/components/Badge/style/index.css',
      'es/components/Card/index.css',
      'es/components/Card/style/index.css',
      'es/components/Card/tokens.css',
      'es/style/external.css',
      'es/style/index.css',
      'es/style/module.css',
      'es/style/themes/dark.css',
      'es/style/themes/light.css',
      'es/themes/dark.css',
      'es/themes/light.css',
      'index.css',
      'lib/components/Badge/index.css',
      'lib/components/Badge/style/index.css',
      'lib/components/Card/index.css',
      'lib/components/Card/style/index.css',
      'lib/components/Card/tokens.css',
      'lib/style/external.css',
      'lib/style/index.css',
      'lib/style/module.css',
      'lib/style/themes/dark.css',
      'lib/style/themes/light.css',
      'lib/themes/dark.css',
      'lib/themes/light.css',
    ]);
    expect(readFile('output/index.css')).toContain(':root { --color: white; }');
    expect(readFile('output/index.css')).toContain(
      ':root[data-theme="dark"] { --color: black; }',
    );
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
      '@import "@website-kernel/markdown/external.css";\n' +
        '@import "@scope/ui/external.css";\n',
    );
    expect(readFile('output/es/style/index.css')).toBe(
      '@import "@website-kernel/markdown/style.css";\n' +
        '@import "@scope/ui/style.css";\n' +
        '@import "./themes/light.css";\n' +
        '@import "./themes/dark.css";\n' +
        '@import "./module.css";\n',
    );
    expect(readFile('output/es/themes/light.css')).toBe(
      '@import "@website-kernel/markdown/themes/light.css";\n' +
        '@import "../style/themes/light.css";\n',
    );
    expect(readFile('output/es/themes/dark.css')).toBe(
      '@import "@website-kernel/markdown/themes/dark.css";\n' +
        '@import "../style/themes/dark.css";\n',
    );
    expect(readFile('output/es/style/module.css')).toContain(
      '.card { color: red; }',
    );
    expect(readFile('output/es/style/module.css')).not.toContain('--color');
    expect(readFile('output/lib/style/index.css')).toContain(
      '@import "./themes/light.css";',
    );
    expect(exists('output/es/components/Card/tokens/style/index.css')).toBe(
      false,
    );
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
      '@import "@scope/ui/es/style/index.css";\n@import "./module.css";\n',
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
      '@import "./module.css";\n',
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

  test('builds empty module CSS entries for second-level tsx modules without styles', async () => {
    writeFile(
      'css.config.mjs',
      `
        export const config = {
          sourceDir: 'source',
          outputDir: 'output',
        };
      `,
    );
    writeFile('source/index.ts', 'export const root = true;');
    writeFile('source/components/Plain/data.ts', 'export const data = [];');
    writeFile(
      'source/components/Plain/index.tsx',
      'export const Plain = () => null;',
    );
    writeFile(
      'source/components/Plain/Part/index.tsx',
      'export const Part = () => null;',
    );
    writeFile(
      'source/pages/AboutPage.tsx',
      'export const AboutPage = () => null;',
    );

    await createBuilder().build();

    expect(readFile('output/es/components/Plain/style/index.css')).toBe(
      '/* Empty style entry kept so automated tooling can resolve this module CSS path. */\n',
    );
    expect(readFile('output/es/pages/AboutPage/style/index.css')).toBe(
      '/* Empty style entry kept so automated tooling can resolve this module CSS path. */\n',
    );
    expect(readFile('output/lib/components/Plain/style/index.css')).toBe(
      '/* Empty style entry kept so automated tooling can resolve this module CSS path. */\n',
    );
    expect(readFile('output/lib/pages/AboutPage/style/index.css')).toBe(
      '/* Empty style entry kept so automated tooling can resolve this module CSS path. */\n',
    );
    expect(exists('output/es/style/index.css')).toBe(false);
    expect(exists('output/es/components/Plain/data/style/index.css')).toBe(
      false,
    );
    expect(exists('output/es/components/Plain/Part/style/index.css')).toBe(
      false,
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
        packageRoot: fixture.root,
      },
      {
        ...moduleCssBuildConfig,
        cssConfigFile: 'css.config.mjs',
      },
    );
  };

  const writeFile = (relativePath: string, content: string) => {
    return fixture.writeFile(relativePath, content);
  };

  const readFile = (relativePath: string) => {
    return fixture.readFile(relativePath);
  };

  const listFiles = (relativePath: string) => {
    return fixture.listFiles(relativePath);
  };

  const exists = (relativePath: string) => {
    return fixture.exists(relativePath);
  };
});
