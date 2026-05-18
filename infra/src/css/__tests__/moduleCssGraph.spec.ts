import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ModuleCssGraph } from '#infra/css/core/index';
import { normalizeCssFileKey } from '#infra/css/core/path';

describe('ModuleCssGraph', () => {
  let tempRoot: string;

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-css-graph-'));
    writeFile('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('creates dev external CSS through recursive workspace kernel dependencies', async () => {
    writeFile(
      'packages/kernel-blog/css.config.ts',
      `
        import type { CssOptions } from '@website/infra/css';

        export const config: CssOptions = {
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
      'packages/kernel-markdown/css.config.ts',
      `
        import type { CssOptions } from '@website/infra/css';

        export const config: CssOptions = {
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
      workspaceRoot: tempRoot,
    });
    const parsed = graph.parseKernelCssId('@website-kernel/blog/external.css');

    const result = await graph.createKernelCssCode(parsed!);

    expect(result.code).toBe('@import "katex/dist/katex.min.css";');
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(tempRoot, 'packages/kernel-blog/css.config.ts'),
      ),
    );
    expect(result.watchFiles).toContain(
      normalizeCssFileKey(
        path.join(tempRoot, 'packages/kernel-markdown/css.config.ts'),
      ),
    );
  });

  test('creates dev style CSS with themes before module styles', async () => {
    writeFile(
      'packages/kernel-blog/css.config.ts',
      `
        import type { CssOptions } from '@website/infra/css';

        export const config: CssOptions = {
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
      'packages/kernel-markdown/css.config.ts',
      `
        import type { CssOptions } from '@website/infra/css';

        export const config: CssOptions = {
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
      workspaceRoot: tempRoot,
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
        path.join(tempRoot, 'packages/kernel-blog/css.config.ts'),
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
      'C:/repo/website/packages/kernel-*/css.config.ts',
    ]);
  });
});
