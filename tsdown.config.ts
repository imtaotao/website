import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type UserConfig } from 'tsdown/config';

type Format = 'cjs' | 'esm' | 'iife';

type PackageJsonLike = {
  name?: string;
  version?: string;
  author?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type BaseOptions = {
  modules?: boolean;
};

type BuildContext = {
  packageRoot: string;
  tsconfig: string;
  pkg: PackageJsonLike;
  dependencyNames: Array<string>;
  packageExternal: Array<string>;
  peerExternal: Array<string>;
  globalName: string;
  banner: string;
};

const formatMap = {
  cjs: '.cjs',
  iife: '.global.js',
  esm: ['.js', '.mjs'],
};

const getExternal = (names: Array<string>) => {
  const external = new Set<string>();

  for (const name of names) {
    external.add(name);
    external.add(`${name}/*`);
  }
  return [...external];
};

const getPackageExternal = (pkg: PackageJsonLike) => {
  return getExternal([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
};

const getPeerExternal = (pkg: PackageJsonLike) => {
  return Object.keys(pkg.peerDependencies ?? {});
};

const getDependencyGlobalName = (name: string) => {
  return name
    .replace(/^@/, '')
    .split(/[/-]/g)
    .filter(Boolean)
    .map((label) => label[0].toUpperCase() + label.slice(1))
    .join('');
};

const getIifeGlobals = (context: BuildContext) => {
  return Object.fromEntries(
    context.peerExternal.map((name) => [name, getDependencyGlobalName(name)]),
  );
};

const getIifeAlwaysBundle = (context: BuildContext) => {
  const names = new Set(context.dependencyNames);

  if (context.peerExternal.includes('react')) {
    names.add('react/jsx-runtime');
    names.add('react/jsx-dev-runtime');
  }

  return [...names];
};

const getGlobalName = (pkg: PackageJsonLike) => {
  return (pkg?.name ?? '')
    .replace(/@/g, '')
    .split(/[/-]/g)
    .map((label) => label[0].toUpperCase() + label.slice(1))
    .join('');
};

const createBuildContext = (dir: string): BuildContext => {
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
    dependencyNames: Object.keys(pkg.dependencies ?? {}),
    packageExternal: getPackageExternal(pkg),
    peerExternal: getPeerExternal(pkg),
    globalName: getGlobalName(pkg),
    banner,
  };
};

const createCommonConfig = (
  context: BuildContext,
  deps: NonNullable<UserConfig['deps']>,
) => {
  return {
    cwd: context.packageRoot,
    clean: false,
    sourcemap: false,
    tsconfig: context.tsconfig,
    target: 'es2018',
    platform: 'browser',
    deps,
    define: {
      __TEST__: 'false',
      __VERSION__: JSON.stringify(context.pkg.version),
      __DEV__:
        '(typeof process !== "undefined" ? (process.env?.NODE_ENV !== "production") : false)',
    },
  } satisfies UserConfig;
};

const createBundleConfigs = (context: BuildContext, formats: Array<Format>) => {
  const outputConfigs: Array<{ format: Format; extname: string }> = [];

  for (const format of formats) {
    const extnames = formatMap[format];
    for (const extname of Array.isArray(extnames) ? extnames : [extnames]) {
      outputConfigs.push({ format, extname });
    }
  }

  return outputConfigs.map(({ format, extname }) => {
    const deps: NonNullable<UserConfig['deps']> =
      format === 'iife'
        ? {
            neverBundle: context.peerExternal,
            alwaysBundle: getIifeAlwaysBundle(context),
            onlyBundle: false,
          }
        : {
            neverBundle: context.packageExternal,
          };

    return {
      ...createCommonConfig(context, deps),
      entry: ['src/index.ts'],
      format,
      globalName: context.globalName,
      outDir: 'dist',
      dts: false,
      treeshake: true,
      banner: context.banner,
      outExtensions: () => ({
        js: extname,
      }),
      outputOptions: {
        entryFileNames: `[name]${extname}`,
        chunkFileNames: `[name]-[hash]${extname}`,
        globals: format === 'iife' ? getIifeGlobals(context) : {},
      },
    };
  }) satisfies Array<UserConfig>;
};

const createModuleConfig = (
  commonConfig: ReturnType<typeof createCommonConfig>,
  format: Extract<Format, 'cjs' | 'esm'>,
  outDir: string,
) => {
  return {
    ...commonConfig,
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
    dts: true,
    unbundle: true,
    outExtensions: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
  } satisfies UserConfig;
};

const createModuleConfigs = (context: BuildContext) => {
  const commonConfig = createCommonConfig(context, {
    neverBundle: context.packageExternal,
  });
  return [
    createModuleConfig(commonConfig, 'esm', 'dist/es'),
    createModuleConfig(commonConfig, 'cjs', 'dist/lib'),
  ] satisfies Array<UserConfig>;
};

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
