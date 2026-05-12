import { baseOptions, type PackageBuildOptions } from '../../tsup.config';

export const packageBuild: PackageBuildOptions = {
  styleDependencies: ['katex/dist/katex.min.css'],
};

export const tsup = baseOptions(import.meta.url, ['cjs', 'esm', 'iife'], {
  packageBuild,
});
