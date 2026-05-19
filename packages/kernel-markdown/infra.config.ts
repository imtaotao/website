import type { InfraConfig } from '@website/infra';

export const config: InfraConfig = {
  sourceDir: 'src',
  outputDir: 'dist',
  build: {
    formats: ['cjs', 'esm', 'iife'],
    modules: true,
  },
  themes: {
    dark: './src/themes/dark.css',
    light: './src/themes/light.css',
  },
  cssDependencies: {
    katex: {
      global: '/dist/katex.min.css',
    },
  },
};
