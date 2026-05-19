import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleStyleImportCollector } from '#infra/css/core/moduleStyleImportCollector';
import type { CssOptions } from '#infra/types';
import type { WorkspaceStyleResolver } from '#infra/css/core/workspaceStyleResolver';

const cssOptions: CssOptions = {
  cssDependencies: {
    '@scope/ui': {
      component: ['/pages/**.css', '/components/**.css'],
    },
  },
};

describe('ModuleStyleImportCollector', () => {
  let tempRoot: string;
  let srcRoot: string;
  let styleRoot: string;
  let collector: ModuleStyleImportCollector;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-css-'));
    srcRoot = path.join(tempRoot, 'src');
    styleRoot = path.join(tempRoot, 'styles');
    fs.mkdirSync(srcRoot, { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({
        imports: {
          '#fixture/*': './src/*.js',
        },
      }),
    );

    const resolver = {
      resolveStyleDependency(specifier: string) {
        return path.join(styleRoot, specifier);
      },
    } as WorkspaceStyleResolver;

    collector = new ModuleStyleImportCollector(srcRoot, tempRoot, resolver);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('collects component styles from package entry named imports', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import {
          Button,
          Dialog,
        } from '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');
    writeStyleDependency('@scope/ui/components/Dialog.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('pages/Article')).toEqual([
      '@scope/ui/components/Button.css',
      '@scope/ui/components/Dialog.css',
    ]);
  });

  test('collects styles from a single string rule', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import { Button } from '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');

    const entries = collector.collect([file], {
      cssDependencies: {
        '@scope/ui': {
          component: '/components/**.css',
        },
      },
    });

    expect(entries.get('pages/Article')).toEqual([
      '@scope/ui/components/Button.css',
    ]);
  });

  test('uses exported component names when named imports are aliased', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import {
          Button as PrimaryButton,
        } from '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('pages/Article')).toEqual([
      '@scope/ui/components/Button.css',
    ]);
  });

  test('collects component styles directly from deep component imports', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import { Button as PrimaryButton } from '@scope/ui/components/Button';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('pages/Article')).toEqual([
      '@scope/ui/components/Button.css',
    ]);
  });

  test('collects page styles from package entry named imports', () => {
    const file = writeSourceFile(
      'routes/App.tsx',
      `
        import { DashboardPage } from '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/pages/DashboardPage.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('routes/App')).toEqual([
      '@scope/ui/pages/DashboardPage.css',
    ]);
  });

  test('collects page styles directly from deep page imports', () => {
    const file = writeSourceFile(
      'routes/App.tsx',
      `
        import { DashboardPage } from '@scope/ui/pages/DashboardPage';
      `,
    );
    writeStyleDependency('@scope/ui/pages/DashboardPage.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('routes/App')).toEqual([
      '@scope/ui/pages/DashboardPage.css',
    ]);
  });

  test('collects direct styles from deep namespace imports', () => {
    const file = writeSourceFile(
      'routes/App.tsx',
      `
        import * as DashboardPage from '@scope/ui/pages/DashboardPage';
      `,
    );
    writeStyleDependency('@scope/ui/pages/DashboardPage.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('routes/App')).toEqual([
      '@scope/ui/pages/DashboardPage.css',
    ]);
  });

  test('collects direct styles from deep namespace imports regardless of rule order', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import * as Button from '@scope/ui/components/Button';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('pages/Article')).toEqual([
      '@scope/ui/components/Button.css',
    ]);
  });

  test('throws for namespace imports from package entries', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import * as UI from '@scope/ui';
      `,
    );

    expect(() => collector.collect([file], cssOptions)).toThrow(
      'Namespace import is not supported for CSS auto import: @scope/ui',
    );
  });

  test('collects styles from source alias imports in the same package', () => {
    const file = writeSourceFile(
      'components/Renderer/index.tsx',
      `
        import { CodeBlock } from '#fixture/components/CodeBlock';
        import type { Heading } from '#fixture/components/Heading';
      `,
    );
    writeSourceFile(
      'components/CodeBlock/index.tsx',
      'export const CodeBlock = () => null;',
    );
    writeSourceFile(
      'components/Heading.ts',
      'export type Heading = { title: string };',
    );
    writeSourceCss('components/Renderer/index.css');
    writeSourceCss('components/CodeBlock/index.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('components/Renderer')).toEqual([
      '../../CodeBlock/style/index.css',
    ]);
  });

  test('collects same-package styles without cssDependencies', () => {
    const file = writeSourceFile(
      'components/Renderer/index.tsx',
      `
        import { CodeBlock } from '#fixture/components/CodeBlock';
      `,
    );
    writeSourceFile(
      'components/CodeBlock/index.tsx',
      'export const CodeBlock = () => null;',
    );
    writeSourceCss('components/Renderer/index.css');
    writeSourceCss('components/CodeBlock/index.css');

    const entries = collector.collect([file], {});

    expect(entries.get('components/Renderer')).toEqual([
      '../../CodeBlock/style/index.css',
    ]);
  });

  test('collects styles from relative imports in the same package', () => {
    const file = writeSourceFile(
      'components/Chat/index.tsx',
      `
        import { DetailsBlock } from '../DetailsBlock';
      `,
    );
    writeSourceFile(
      'components/DetailsBlock/index.tsx',
      'export const DetailsBlock = () => null;',
    );
    writeSourceCss('components/Chat/index.css');
    writeSourceCss('components/DetailsBlock/index.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.get('components/Chat')).toEqual([
      '../../DetailsBlock/style/index.css',
    ]);
  });

  test('collects styles from same-package file modules with sibling CSS', () => {
    const file = writeSourceFile(
      'components/Renderer/index.tsx',
      `
        import { Button } from '#fixture/components/Button';
      `,
    );
    writeSourceFile(
      'components/Button.tsx',
      'export const Button = () => null;',
    );
    writeSourceCss('components/Button.css');

    const entries = collector.collect([file], {});

    expect(entries.get('components/Renderer')).toEqual([
      '../../Button/style/index.css',
    ]);
  });

  test('skips inferred component styles that do not exist', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import { MissingComponent } from '@scope/ui';
      `,
    );

    const entries = collector.collect([file], cssOptions);

    expect(entries.size).toBe(0);
  });

  test('does not infer styles from package entry side-effect imports', () => {
    const file = writeSourceFile(
      'pages/Article.tsx',
      `
        import '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');

    const entries = collector.collect([file], cssOptions);

    expect(entries.size).toBe(0);
  });

  test('skips type-only imports and declaration files', () => {
    const sourceFile = writeSourceFile(
      'pages/Article.tsx',
      `
        import type { Button } from '@scope/ui';
      `,
    );
    const declarationFile = writeSourceFile(
      'pages/Article.d.ts',
      `
        import { Dialog } from '@scope/ui';
      `,
    );
    writeStyleDependency('@scope/ui/components/Button.css');
    writeStyleDependency('@scope/ui/components/Dialog.css');

    const entries = collector.collect(
      [sourceFile, declarationFile],
      cssOptions,
    );

    expect(entries.size).toBe(0);
  });

  const writeSourceFile = (relativePath: string, code: string) => {
    const file = path.join(srcRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, code);
    return file;
  };

  const writeStyleDependency = (specifier: string) => {
    const file = path.join(styleRoot, specifier);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
  };

  const writeSourceCss = (relativePath: string) => {
    const file = path.join(srcRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
  };
});
