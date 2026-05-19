import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleCssGraph } from '#auklet/css/core/moduleCssGraph';
import { normalizeCssFileKey } from '#auklet/css/core/path';
import { createCssTestFixture, type CssTestFixture } from './cssTestFixture';

describe('ModuleCssGraph', () => {
  let fixture: CssTestFixture;

  beforeEach(() => {
    fixture = createCssTestFixture('auklet-css-graph-');
    writeFile('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
    writeFile(
      'packages/app-package/package.json',
      JSON.stringify({ name: '@scope/app' }),
    );
    writeFile(
      'packages/ui-package/package.json',
      JSON.stringify({ name: '@scope/ui' }),
    );
  });

  afterEach(() => {
    fixture.cleanup();
  });

  test('creates dev external CSS through recursive workspace kernel dependencies', async () => {
    writeFile(
      'packages/app-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          cssDependencies: {
            '@scope/ui': {
              global: '/style.css',
              themes: {
                light: '/themes/light.css',
                dark: '/themes/dark.css',
              },
            },
          },
        };
      `,
    );
    writeFile(
      'packages/ui-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          cssDependencies: {
            katex: {
              global: '/dist/katex.min.css',
            },
          },
        };
      `,
    );

    const graph = new ModuleCssGraph({
      workspaceRoot: fixture.root,
    });
    const parsed = graph.parsePackageCssId('@scope/app/external.css');

    const result = await graph.createPackageCssCode(parsed!);

    expect(result.code).toBe('@import "katex/dist/katex.min.css";');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(fixture.root, 'packages/app-package/auklet.config.ts'),
      ),
    );
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(fixture.root, 'packages/ui-package/auklet.config.ts'),
      ),
    );
  });

  test('creates dev style CSS with themes before module styles', async () => {
    writeFile(
      'packages/app-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          themes: {
            light: './src/themes/light.css',
            dark: './src/themes/dark.css',
          },
          cssDependencies: {
            '@scope/ui': {
              global: '/style.css',
              themes: {
                light: '/themes/light.css',
                dark: '/themes/dark.css',
              },
            },
          },
        };
      `,
    );
    writeFile(
      'packages/ui-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          themes: {
            light: './src/themes/light.css',
            dark: './src/themes/dark.css',
          },
          cssDependencies: {
            katex: {
              global: '/dist/katex.min.css',
            },
          },
        };
      `,
    );
    writeFile(
      'packages/ui-package/src/themes/light.css',
      '.markdown-shell { --markdown-bg: white; }',
    );
    writeFile(
      'packages/ui-package/src/themes/dark.css',
      '.markdown-shell { --markdown-bg: black; }',
    );
    writeFile(
      'packages/ui-package/src/components/Renderer/index.css',
      '.markdown-prose { color: var(--markdown-text); }',
    );
    writeFile(
      'packages/app-package/src/themes/light.css',
      ':root { --bg: white; }',
    );
    writeFile(
      'packages/app-package/src/themes/dark.css',
      ':root[data-wk-theme="dark"] { --bg: black; }',
    );
    writeFile(
      'packages/app-package/src/pages/BlogArticlePage.css',
      '.article { background: var(--bg); }',
    );

    const graph = new ModuleCssGraph({
      workspaceRoot: fixture.root,
    });
    const parsed = graph.parsePackageCssId('@scope/app/style.css');

    const result = await graph.createPackageCssCode(parsed!);

    expect(result.code.indexOf('@import "katex/dist/katex.min.css";')).toBe(0);
    expect(result.code.indexOf('.markdown-shell')).toBeLessThan(
      result.code.indexOf(':root { --bg: white; }'),
    );
    expect(result.code.indexOf('.markdown-prose')).toBeLessThan(
      result.code.indexOf(':root { --bg: white; }'),
    );
    expect(result.code.indexOf(':root { --bg: white; }')).toBeLessThan(
      result.code.indexOf('.article { background: var(--bg); }'),
    );
    expect(result.code).toContain(
      ':root[data-wk-theme="dark"] { --bg: black; }',
    );
    expect(result.code).not.toContain('src/themes/light.css');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(fixture.root, 'packages/app-package/auklet.config.ts'),
      ),
    );
    const lightTheme = await graph.createPackageCssCode(
      graph.parsePackageCssId('@scope/app/themes/light.css')!,
    );
    const darkTheme = await graph.createPackageCssCode(
      graph.parsePackageCssId('@scope/app/themes/dark.css')!,
    );

    expect(lightTheme.code.indexOf('.markdown-shell')).toBeLessThan(
      lightTheme.code.indexOf(':root { --bg: white; }'),
    );
    expect(lightTheme.code).toContain(':root { --bg: white; }');
    expect(darkTheme.code.indexOf('.markdown-shell')).toBeLessThan(
      darkTheme.code.indexOf(':root[data-wk-theme="dark"]'),
    );
    expect(darkTheme.code).toContain(
      ':root[data-wk-theme="dark"] { --bg: black; }',
    );
  });

  test('normalizes slash styles for workspace source graph checks and watch roots', () => {
    const graph = new ModuleCssGraph({
      workspaceRoot: 'C:\\repo\\workspace',
    });

    expect(
      graph.isWorkspaceSourceGraphFile(
        'C:\\repo\\workspace\\packages\\app-package\\src\\pages\\Blog\\index.css',
      ),
    ).toBe(true);
    expect(
      graph.isWorkspaceSourceGraphFile(
        'C:/repo/workspace/packages/app-package/src/pages/Blog/index.tsx',
      ),
    ).toBe(true);
    expect(
      graph.isWorkspaceSourceGraphFile(
        'C:\\repo\\workspace\\packages\\shared\\src\\index.css',
      ),
    ).toBe(true);
    expect(graph.getWatchRoots()).toEqual([
      'C:/repo/workspace/packages/*/src',
      'C:/repo/workspace/packages/*/auklet.config.ts',
    ]);
  });

  test('creates source module CSS with dependency modules before own styles', async () => {
    writeFile(
      'packages/app-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          cssDependencies: {
            '@scope/ui': {
              global: '/style.css',
              themes: {
                light: '/themes/light.css',
                dark: '/themes/dark.css',
              },
              component: ['/components/**.css'],
            },
          },
        };
      `,
    );
    writeFile(
      'packages/ui-package/auklet.config.ts',
      `
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          themes: {
            light: './src/themes/light.css',
            dark: './src/themes/dark.css',
          },
        };
      `,
    );
    writeFile(
      'packages/app-package/src/pages/BlogArticlePage.tsx',
      `
        import { Renderer } from '@scope/ui';
        export const BlogArticlePage = () => Renderer;
      `,
    );
    writeFile(
      'packages/app-package/src/pages/BlogArticlePage.css',
      '.article { color: var(--blog-text); }',
    );
    writeFile(
      'packages/ui-package/src/themes/light.css',
      '.markdown-shell { --markdown-bg: white; }',
    );
    writeFile(
      'packages/ui-package/src/components/Renderer/index.css',
      '.markdown-prose { color: var(--markdown-text); }',
    );

    const graph = new ModuleCssGraph({
      workspaceRoot: fixture.root,
    });
    const result = await graph.createPackageCssCode(
      graph.parsePackageCssId('@scope/app/pages/BlogArticlePage.css')!,
    );

    expect(result.code.indexOf('.markdown-prose')).toBeLessThan(
      result.code.indexOf('.article'),
    );
    expect(result.code).not.toContain('.markdown-shell');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(
          fixture.root,
          'packages/app-package/src/pages/BlogArticlePage.tsx',
        ),
      ),
    );
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(
          fixture.root,
          'packages/app-package/src/pages/BlogArticlePage.css',
        ),
      ),
    );
  });

  const writeFile = (relativePath: string, content: string) => {
    return fixture.writeFile(relativePath, content);
  };
});
