import { describe, expect, test } from 'vitest';
import { resolveCssOptionsModule } from '#infra/css/core/index';

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

  test('reads config from default export wrapper', () => {
    expect(
      resolveCssOptionsModule({
        default: {
          config: {
            sourceDir: 'src',
            outputDir: 'dist',
          },
        },
      }),
    ).toEqual({
      sourceDir: 'src',
      outputDir: 'dist',
    });
  });

  test('reads config from module.exports wrapper', () => {
    expect(
      resolveCssOptionsModule({
        'module.exports': {
          config: {
            cssDependencies: {
              katex: {
                global: '/dist/katex.min.css',
              },
            },
          },
        },
      }),
    ).toEqual({
      cssDependencies: {
        katex: {
          global: '/dist/katex.min.css',
        },
      },
    });
  });

  test('falls back to empty config for unsupported module shapes', () => {
    expect(resolveCssOptionsModule({ default: null })).toEqual({});
  });
});
