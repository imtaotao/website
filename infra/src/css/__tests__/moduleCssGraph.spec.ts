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
