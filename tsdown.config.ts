import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig, type UserConfig } from 'tsdown/config';

const require = createRequire(import.meta.url);
const tailwindConfig = require('./tailwind.config.js');

type Format = 'cjs' | 'esm' | 'iife';

type PackageJsonLike = {
  name?: string;
  version?: string;
  author?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type BaseOptions = {
  modules?: boolean;
};

type BuildContext = {
  packageRoot: string;
  tsconfig: string;
  pkg: PackageJsonLike;
  external: Array<string>;
  globalName: string;
  banner: string;
};

const formatMap = {
  cjs: '.cjs',
  iife: '.global.js',
  esm: ['.js', '.mjs'],
};

function getPackageExternal(pkg: PackageJsonLike) {
  const external = new Set<string>();
  const depNames = new Set([
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

function getGlobalName(pkg: PackageJsonLike) {
  return (pkg?.name ?? '')
    .replace(/@/g, '')
    .split(/[/-]/g)
    .map((label) => label[0].toUpperCase() + label.slice(1))
    .join('');
}

function tailwindPostcssPlugin() {
  return {
    name: 'postcss-tailwind',
    async transform(code: string, id: string) {
      const filePath = id.split('?')[0];
      if (!filePath.endsWith('.css')) return null;

      const shouldProcessTailwind =
        /@tailwind\s+(base|components|utilities)\b/.test(code) ||
        /@import\s+['\"]tailwindcss/.test(code);

      if (!shouldProcessTailwind) return null;

      const postcss = require('postcss');
      const tailwindcss = require('tailwindcss');
      const result = await postcss([
        tailwindcss({ config: tailwindConfig }),
      ]).process(code, { from: filePath });

      return {
        code: result.css,
        map: result.map?.toJSON(),
      };
    },
  } as NonNullable<UserConfig['plugins']>;
}

function createBuildContext(dir: string): BuildContext {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('./package.json', dir)).toString(),
  ) as PackageJsonLike;
  const banner =
    '/*!\n' +
    ` * ${pkg.name}.js v${pkg.version}\n` +
    ` * (c) 2026-${new Date().getFullYear()} ${
      pkg.author || 'chentao.arthur'
    }\n` +
    ' */';

  return {
    packageRoot: fileURLToPath(new URL('.', dir)),
    tsconfig: fileURLToPath(new URL('../../tsconfig.json', dir)),
    pkg,
    external: getPackageExternal(pkg),
    globalName: getGlobalName(pkg),
    banner,
  };
}

function createBundleConfigs(context: BuildContext, formats: Array<Format>) {
  const outputConfigs: Array<{ format: Format; extname: string }> = [];

  for (const format of formats) {
    const extnames = formatMap[format];
    for (const extname of Array.isArray(extnames) ? extnames : [extnames]) {
      outputConfigs.push({ format, extname });
    }
  }

  return outputConfigs.map(({ format, extname }) => ({
    cwd: context.packageRoot,
    entry: ['src/index.ts'],
    format,
    globalName: context.globalName,
    outDir: 'dist',
    clean: false,
    dts: false,
    treeshake: true,
    sourcemap: false,
    tsconfig: context.tsconfig,
    target: 'es2018',
    platform: 'browser',
    deps: {
      neverBundle: context.external,
    },
    plugins: [tailwindPostcssPlugin()],
    css: {
      splitting: false,
      fileName: 'index.css',
    },
    banner: context.banner,
    define: {
      __TEST__: 'false',
      __VERSION__: JSON.stringify(context.pkg.version),
      __DEV__:
        '(typeof process !== "undefined" ? (process.env?.NODE_ENV !== "production") : false)',
    },
    outExtensions: () => ({
      js: extname,
    }),
    outputOptions: {
      entryFileNames: `[name]${extname}`,
      chunkFileNames: `[name]-[hash]${extname}`,
    },
  })) satisfies Array<UserConfig>;
}

function createModuleConfigs(context: BuildContext) {
  return [
    createModuleConfig(context, 'esm', 'dist/es'),
    createModuleConfig(context, 'cjs', 'dist/lib'),
  ] satisfies Array<UserConfig>;
}

function createModuleConfig(
  context: BuildContext,
  format: Extract<Format, 'cjs' | 'esm'>,
  outDir: string,
) {
  return {
    cwd: context.packageRoot,
    entry: [
      'src/**/*.ts',
      'src/**/*.tsx',
      '!src/**/*.d.ts',
      '!src/**/__tests__/**',
      '!src/**/*.spec.ts',
      '!src/**/*.spec.tsx',
    ],
    format,
    outDir,
    clean: false,
    dts: true,
    unbundle: true,
    sourcemap: false,
    tsconfig: context.tsconfig,
    target: 'es2018',
    platform: 'browser',
    deps: {
      neverBundle: context.external,
    },
    plugins: [tailwindPostcssPlugin()],
    css: format === 'esm' ? { inject: true } : { inject: false },
    outExtensions: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
    define: {
      __TEST__: 'false',
      __VERSION__: JSON.stringify(context.pkg.version),
      __DEV__:
        '(typeof process !== "undefined" ? (process.env?.NODE_ENV !== "production") : false)',
    },
  } satisfies UserConfig;
}

export function baseOptions(
  dir: string,
  formats: Array<Format>,
  options: BaseOptions = {},
) {
  const context = createBuildContext(dir);
  const bundleConfigs = createBundleConfigs(context, formats);
  const moduleConfigs = options.modules ? createModuleConfigs(context) : [];

  return defineConfig([...bundleConfigs, ...moduleConfigs]);
}
