import {
  baseOptions,
  type PackageBuildOptions,
} from '@website/infra/tsup.config';

export const packageBuild: PackageBuildOptions = {
  styleDependencies: ['katex/dist/katex.min.css'],
};

export const tsup: unknown = baseOptions(
  import.meta.url,
  ['cjs', 'esm', 'iife'],
  {
    packageBuild,
  },
);
