import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('tsdown/config', () => ({
  defineConfig: vi.fn((config: unknown) => config),
}));

import {
  defineKernelPackageConfigFromFile,
  defineKernelPackageConfigFromOptions,
} from '#infra/build/tsdownConfig';

const writeFile = (root: string, relativePath: string, content: string) => {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
};

describe('defineKernelPackageConfigFromOptions', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-tsdown-'));
    writeFile(
      tempRoot,
      'package.json',
      JSON.stringify({
        name: '@scope/fixture-package',
        version: '1.2.3',
        author: 'tester',
        dependencies: {
          aidly: '^1.0.0',
        },
        peerDependencies: {
          react: '^19.0.0',
        },
      }),
    );
    writeFile(tempRoot, 'tsconfig.package.json', '{}');
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('maps infra build options to bundle and module tsdown configs', () => {
    const configs = defineKernelPackageConfigFromOptions(tempRoot, {
      build: {
        formats: ['esm'],
        externals: ['@scope/external'],
        modules: true,
        tsconfig: 'tsconfig.package.json',
      },
    });

    expect(configs).toHaveLength(4);
    expect(configs[0]).toMatchObject({
      cwd: tempRoot,
      entry: ['src/index.ts'],
      format: 'esm',
      outDir: 'dist',
      dts: false,
      tsconfig: path.join(tempRoot, 'tsconfig.package.json'),
      deps: {
        neverBundle: [
          'aidly',
          'aidly/*',
          'react',
          'react/*',
          '@scope/external',
          '@scope/external/*',
        ],
      },
      outputOptions: {
        entryFileNames: '[name].js',
      },
    });
    expect(configs[1]).toMatchObject({
      format: 'esm',
      outputOptions: {
        entryFileNames: '[name].mjs',
      },
    });
    expect(configs[2]).toMatchObject({
      entry: [
        'src/**/*.ts',
        'src/**/*.tsx',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/*.spec.ts',
        '!src/**/*.spec.tsx',
      ],
      format: 'esm',
      outDir: 'dist/es',
      dts: true,
      deps: {
        neverBundle: [
          'aidly',
          'aidly/*',
          'react',
          'react/*',
          '@scope/external',
          '@scope/external/*',
        ],
      },
      unbundle: true,
    });
    expect(configs[3]).toMatchObject({
      format: 'cjs',
      outDir: 'dist/lib',
      dts: true,
      unbundle: true,
    });
  });

  test('omits the banner author line when package author is missing', () => {
    writeFile(
      tempRoot,
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        version: '1.2.3',
      }),
    );

    const configs = defineKernelPackageConfigFromOptions(tempRoot, {
      build: {
        formats: ['cjs'],
      },
    });

    expect(configs[0]).toMatchObject({
      banner: '/*!\n * fixture-package.js v1.2.3\n */',
    });
  });

  test('uses custom banner from infra build options', () => {
    const configs = defineKernelPackageConfigFromOptions(tempRoot, {
      build: {
        formats: ['cjs'],
        banner: '/* custom banner */',
      },
    });

    expect(configs[0]).toMatchObject({
      banner: '/* custom banner */',
    });
  });

  test('merges manual externals into iife peer externals', () => {
    const configs = defineKernelPackageConfigFromOptions(tempRoot, {
      build: {
        formats: ['iife'],
        externals: ['react-dom'],
      },
    });

    expect(configs).toHaveLength(1);
    expect(configs[0]).toMatchObject({
      format: 'iife',
      deps: {
        neverBundle: ['react', 'react-dom'],
        alwaysBundle: ['aidly', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
        onlyBundle: false,
      },
      outputOptions: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDom',
        },
      },
    });
  });
});

describe('defineKernelPackageConfigFromFile', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-tsdown-file-'));
    writeFile(
      tempRoot,
      'package.json',
      JSON.stringify({
        name: 'fixture-package',
        version: '1.0.0',
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('loads infra config from the package root', async () => {
    writeFile(
      tempRoot,
      'infra.config.ts',
      `
        export const config = {
          build: {
            formats: ['cjs'],
          },
        };
      `,
    );

    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(tempRoot);
    try {
      const configs = await defineKernelPackageConfigFromFile();
      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        cwd: tempRoot,
        format: 'cjs',
        outDir: 'dist',
      });
    } finally {
      cwd.mockRestore();
    }
  });
});
