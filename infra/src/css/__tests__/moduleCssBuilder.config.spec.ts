import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadCssOptions, resolveCssOptionsModule } from '#infra/css/core/index';

describe('loadCssOptions', () => {
  let tempRoot: string;

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-css-options-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('loads TypeScript css config without dynamic data url import', async () => {
    writeFile(
      'css.config.ts',
      `
        import type { CssOptions } from '@website/infra/css';

        export const config: CssOptions = {
          sourceDir: 'source',
          outputDir: 'output',
          cssDependencies: {
            katex: {
              global: '/dist/katex.min.css',
            },
          },
        };
      `,
    );

    await expect(
      loadCssOptions(tempRoot, 'css.config.ts', { cacheBust: true }),
    ).resolves.toEqual({
      sourceDir: 'source',
      outputDir: 'output',
      cssDependencies: {
        katex: {
          global: '/dist/katex.min.css',
        },
      },
    });
  });
});

describe('resolveCssOptionsModule', () => {
  test('reads config from direct named export', () => {
    expect(
      resolveCssOptionsModule({
        config: {
          sourceDir: 'src',
          outputDir: 'dist',
        },
      }),
    ).toEqual({
      sourceDir: 'src',
      outputDir: 'dist',
    });
  });

  test('falls back to empty config for unsupported module shapes', () => {
    expect(resolveCssOptionsModule({ default: null })).toEqual({});
  });
});
