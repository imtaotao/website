import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  loadAukletConfig,
  resolveAukletConfigModule,
} from '#auklet/configLoader';

describe('loadAukletConfig', () => {
  let tempRoot: string;

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auklet-css-options-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('returns empty config when the config file is missing', async () => {
    await expect(loadAukletConfig(tempRoot)).resolves.toEqual({});
  });

  test('loads TypeScript auklet config as an ES module', async () => {
    writeFile(
      'dependency.mjs',
      `
        export const dependency = {
          global: '/dist/dependency.css',
        };
      `,
    );
    writeFile(
      'auklet.config.ts',
      `
        import { dependency } from './dependency.mjs';
        import type { AukletConfig } from '/auklet';

        export const config: AukletConfig = {
          sourceDir: 'source',
          outputDir: 'output',
          build: {
            formats: ['esm'],
          },
          cssDependencies: {
            katex: dependency,
          },
        };
      `,
    );

    await expect(
      loadAukletConfig(tempRoot, { cacheBust: true }),
    ).resolves.toEqual({
      sourceDir: 'source',
      outputDir: 'output',
      build: {
        formats: ['esm'],
      },
      cssDependencies: {
        katex: {
          global: '/dist/dependency.css',
        },
      },
    });
  });

  test('removes the temporary module generated for TypeScript config', async () => {
    writeFile(
      'auklet.config.ts',
      `
        export const config = {
          sourceDir: 'source',
        };
      `,
    );

    await loadAukletConfig(tempRoot, { cacheBust: true });

    expect(
      fs
        .readdirSync(tempRoot)
        .some(
          (file) => file.startsWith('.auklet.config.') && file.endsWith('.mjs'),
        ),
    ).toBe(false);
  });
});

describe('resolveAukletConfigModule', () => {
  test('reads config from direct named export', () => {
    expect(
      resolveAukletConfigModule({
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
    expect(resolveAukletConfigModule({ default: null })).toEqual({});
  });
});
