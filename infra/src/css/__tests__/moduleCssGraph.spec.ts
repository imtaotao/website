import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleCssGraph } from '#infra/css/core/moduleCssGraph';
import { normalizeCssFileKey } from '#infra/css/core/path';
import { createCssTestFixture, type CssTestFixture } from './cssTestFixture';

describe('ModuleCssGraph', () => {
  let fixture: CssTestFixture;

  beforeEach(() => {
    fixture = createCssTestFixture('infra-css-graph-');
    writeFile('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
  });

  afterEach(() => {
    fixture.cleanup();
  });

  test('creates dev external CSS through recursive workspace kernel dependencies', async () => {
    writeFile(
      'packages/kernel-blog/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          cssDependencies: {
            '@website-kernel/markdown': {
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
      'packages/kernel-markdown/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
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
    const parsed = graph.parseKernelCssId('@website-kernel/blog/external.css');

    const result = await graph.createKernelCssCode(parsed!);

    expect(result.code).toBe('@import "katex/dist/katex.min.css";');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(fixture.root, 'packages/kernel-blog/infra.config.ts'),
      ),
    );
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(fixture.root, 'packages/kernel-markdown/infra.config.ts'),
      ),
    );
  });

  test('creates dev style CSS with themes before module styles', async () => {
    writeFile(
      'packages/kernel-blog/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          themes: {
            light: './src/themes/light.css',
            dark: './src/themes/dark.css',
          },
          cssDependencies: {
            '@website-kernel/markdown': {
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
      'packages/kernel-markdown/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
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
      'packages/kernel-markdown/src/themes/light.css',
      '.markdown-shell { --markdown-bg: white; }',
    );
    writeFile(
      'packages/kernel-markdown/src/themes/dark.css',
      '.markdown-shell { --markdown-bg: black; }',
    );
    writeFile(
      'packages/kernel-markdown/src/components/Renderer/index.css',
      '.markdown-prose { color: var(--markdown-text); }',
    );
    writeFile(
      'packages/kernel-blog/src/themes/light.css',
      ':root { --bg: white; }',
    );
    writeFile(
      'packages/kernel-blog/src/themes/dark.css',
      ':root[data-wk-theme="dark"] { --bg: black; }',
    );
    writeFile(
      'packages/kernel-blog/src/pages/BlogArticlePage.css',
      '.article { background: var(--bg); }',
    );

    const graph = new ModuleCssGraph({
      workspaceRoot: fixture.root,
    });
    const parsed = graph.parseKernelCssId('@website-kernel/blog/style.css');

    const result = await graph.createKernelCssCode(parsed!);

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
        path.join(fixture.root, 'packages/kernel-blog/infra.config.ts'),
      ),
    );
    const lightTheme = await graph.createKernelCssCode(
      graph.parseKernelCssId('@website-kernel/blog/themes/light.css')!,
    );
    const darkTheme = await graph.createKernelCssCode(
      graph.parseKernelCssId('@website-kernel/blog/themes/dark.css')!,
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

  test('normalizes slash styles for kernel source graph checks and watch roots', () => {
    const graph = new ModuleCssGraph({
      workspaceRoot: 'C:\\repo\\website',
    });

    expect(
      graph.isKernelSourceGraphFile(
        'C:\\repo\\website\\packages\\kernel-blog\\src\\pages\\Blog\\index.css',
      ),
    ).toBe(true);
    expect(
      graph.isKernelSourceGraphFile(
        'C:/repo/website/packages/kernel-blog/src/pages/Blog/index.tsx',
      ),
    ).toBe(true);
    expect(
      graph.isKernelSourceGraphFile(
        'C:\\repo\\website\\packages\\shared\\src\\index.css',
      ),
    ).toBe(false);
    expect(graph.getWatchRoots()).toEqual([
      'C:/repo/website/packages/kernel-*/src',
      'C:/repo/website/packages/kernel-*/infra.config.ts',
    ]);
  });

  test('creates source module CSS with dependency modules before own styles', async () => {
    writeFile(
      'packages/kernel-blog/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
          sourceDir: 'src',
          outputDir: 'dist',
          cssDependencies: {
            '@website-kernel/markdown': {
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
      'packages/kernel-markdown/infra.config.ts',
      `
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
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
      'packages/kernel-blog/src/pages/BlogArticlePage.tsx',
      `
        import { Renderer } from '@website-kernel/markdown';
        export const BlogArticlePage = () => Renderer;
      `,
    );
    writeFile(
      'packages/kernel-blog/src/pages/BlogArticlePage.css',
      '.article { color: var(--blog-text); }',
    );
    writeFile(
      'packages/kernel-markdown/src/themes/light.css',
      '.markdown-shell { --markdown-bg: white; }',
    );
    writeFile(
      'packages/kernel-markdown/src/components/Renderer/index.css',
      '.markdown-prose { color: var(--markdown-text); }',
    );

    const graph = new ModuleCssGraph({
      workspaceRoot: fixture.root,
    });
    const result = await graph.createKernelCssCode(
      graph.parseKernelCssId('@website-kernel/blog/pages/BlogArticlePage.css')!,
    );

    expect(result.code.indexOf('.markdown-prose')).toBeLessThan(
      result.code.indexOf('.article'),
    );
    expect(result.code).not.toContain('.markdown-shell');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(
          fixture.root,
          'packages/kernel-blog/src/pages/BlogArticlePage.tsx',
        ),
      ),
    );
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(
          fixture.root,
          'packages/kernel-blog/src/pages/BlogArticlePage.css',
        ),
      ),
    );
  });

  const writeFile = (relativePath: string, content: string) => {
    return fixture.writeFile(relativePath, content);
  };
});
