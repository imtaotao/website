import { type AukletConfig, aukletDefaultCssDependencyConfig } from 'auklet';

export const config: AukletConfig = {
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
    '@website-kernel/markdown': aukletDefaultCssDependencyConfig,
  },
};
