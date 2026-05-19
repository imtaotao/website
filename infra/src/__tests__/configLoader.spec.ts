import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadInfraConfig, resolveInfraConfigModule } from '#infra/configLoader';

describe('loadInfraConfig', () => {
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

  test('returns empty config when the config file is missing', async () => {
    await expect(loadInfraConfig(tempRoot)).resolves.toEqual({});
  });

  test('loads TypeScript infra config as an ES module', async () => {
    writeFile(
      'dependency.mjs',
      `
        export const dependency = {
          global: '/dist/dependency.css',
        };
      `,
    );
    writeFile(
      'infra.config.ts',
      `
        import { dependency } from './dependency.mjs';
        import type { InfraConfig } from '/infra';

        export const config: InfraConfig = {
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
      loadInfraConfig(tempRoot, { cacheBust: true }),
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
      'infra.config.ts',
      `
        export const config = {
          sourceDir: 'source',
        };
      `,
    );

    await loadInfraConfig(tempRoot, { cacheBust: true });

    expect(
      fs
        .readdirSync(tempRoot)
        .some(
          (file) => file.startsWith('.infra.config.') && file.endsWith('.mjs'),
        ),
    ).toBe(false);
  });
});

describe('resolveInfraConfigModule', () => {
  test('reads config from direct named export', () => {
    expect(
      resolveInfraConfigModule({
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
    expect(resolveInfraConfigModule({ default: null })).toEqual({});
  });
});
