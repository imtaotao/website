import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { replace } from 'esbuild-plugin-replace';
import minimist from 'minimist';
import type { Options } from 'tsup';

type EsbuildOnLoadArgs = Parameters<EsbuildOnLoadCallback>[0];
type EsbuildPluginBuild = Parameters<TsupEsbuildPlugin['setup']>[0];
type EsbuildOnLoadCallback = Parameters<EsbuildPluginBuild['onLoad']>[1];
type EsbuildOnLoadResult = Awaited<ReturnType<EsbuildOnLoadCallback>>;
type TsupEsbuildOptions = NonNullable<Options['esbuildOptions']>;
type TsupEsbuildPlugin = NonNullable<Options['esbuildPlugins']>[number];

const argv = minimist<{ watch: boolean }>(process.argv.slice(2));

const require = createRequire(import.meta.url);
const createTailwindConfig = require('./tailwind.config.cjs');

type BaseOptions = {
  styleImports?: Array<string>;
  packageBuild?: PackageBuildOptions;
};

type PackageJsonLike = {
  name?: string;
  version?: string;
  author?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export type PackageBuildOptions = {
  styleDependencies?: Array<string>;
  componentStyleDependencies?: Record<string, string | Array<string>>;
};

function getPackageExternal(pkg: PackageJsonLike) {
  const external = new Set<string>();
  const depNames = new Set<string>([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  for (const name of depNames) {
    external.add(name);
    external.add(`${name}/*`);
  }
  return [...external];
}

function tailwindPostcssEsbuildPlugin(repoRoot: string) {
  const tailwindConfig = createTailwindConfig(repoRoot);
  const plugin: TsupEsbuildPlugin = {
    name: 'postcss-tailwind',
    setup(build: EsbuildPluginBuild) {
      build.onLoad({ filter: /\.css$/ }, async (args: EsbuildOnLoadArgs) => {
        const css = await fs.promises.readFile(args.path, 'utf8');

        const shouldProcessTailwind =
          /@tailwind\s+(base|components|utilities)\b/.test(css) ||
          /@import\s+['\"]tailwindcss/.test(css);

        if (!shouldProcessTailwind) {
          return {
            contents: css,
            loader: 'css',
            resolveDir: path.dirname(args.path),
          } satisfies EsbuildOnLoadResult;
        }

        const postcss = require('postcss');
        const tailwindcss = require('tailwindcss');
        const result = await postcss([
          tailwindcss({ config: tailwindConfig }),
        ]).process(css, { from: args.path });

        return {
          loader: 'css',
          contents: result.css,
          resolveDir: path.dirname(args.path),
        } satisfies EsbuildOnLoadResult;
      });
    },
  };
  return plugin;
}

function findRepoRoot(startDir: string) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return startDir;
}

const formatMap = {
  cjs: '.cjs',
  iife: '.global.js',
  esm: ['.js', '.mjs'],
};

export function baseOptions(
  dir: string,
  formats: Array<keyof typeof formatMap>,
  options: BaseOptions = {},
) {
  const packageRoot = fileURLToPath(new URL('.', dir));
  const repoRoot = findRepoRoot(packageRoot);
  const pkg: PackageJsonLike = JSON.parse(
    fs.readFileSync(new URL('./package.json', dir)).toString(),
  );

  const entry = 'src/index.ts';
  const external = getPackageExternal(pkg);
  const banner =
    '/*!\n' +
    ` * ${pkg.name}.js v${pkg.version}\n` +
    ` * (c) 2026-${new Date().getFullYear()} ${
      pkg.author || 'chentao.arthur'
    }\n` +
    ' */';
  const styleBanner = options.styleImports
    ?.map((id) => `@import "${id}";`)
    .join('\n');

  const outputConfigs: Array<{ format: string; extname: string }> = [];

  for (const format of formats) {
    let extname = formatMap[format];
    if (!Array.isArray(extname)) extname = [extname];
    for (const ext of extname) {
      outputConfigs.push({ format, extname: ext });
    }
  }

  const globalName = (pkg?.name ?? '')
    .replace(/@/g, '')
    .split(/[\/-]/g)
    .map((l: string) => l[0].toUpperCase() + l.slice(1))
    .join('');

  return outputConfigs
    .filter(({ extname }) => (argv.watch ? /^\.(c?)js/.test(extname) : true))
    .map(({ format, extname }) => ({
      format,
      globalName,
      entry: [entry],
      dts: false,
      treeshake: true,
      clean: !argv.watch,
      sourcemap: argv.watch,
      watch: argv.watch ? 'src' : false,
      external,
      loader: {
        '.css': 'css',
      },
      injectStyle: false,
      banner: {
        js: banner.trim(),
        ...(styleBanner ? { css: styleBanner } : {}),
      },
      outExtension: () => ({
        js: extname,
      }),
      define: {
        __TEST__: 'false',
        __VERSION__: `'${pkg.version}'`,
      },
      esbuildOptions: (options: Parameters<TsupEsbuildOptions>[0]) => {
        options.jsx = 'automatic';
        options.jsxImportSource = 'react';
      },
      esbuildPlugins: [
        replace({
          __DEV__:
            '(typeof process !== "undefined" ? (process.env?.NODE_ENV !== "production") : false)',
        }),
        tailwindPostcssEsbuildPlugin(repoRoot),
      ],
    })) as unknown;
}
