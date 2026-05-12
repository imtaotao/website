import { baseOptions, type PackageBuildOptions } from '../../tsup.config';

export const packageBuild: PackageBuildOptions = {
  styleDependencies: ['@website-kernel/markdown/style.css'],
  componentStyleDependencies: {
    'pages/BlogArticlePage': [
      '@website-kernel/markdown/es/components/Renderer/style/index.css',
      '@website-kernel/markdown/es/components/Lightbox/style/index.css',
    ],
  },
};

export const tsup = baseOptions(import.meta.url, ['cjs', 'esm', 'iife'], {
  packageBuild,
});
