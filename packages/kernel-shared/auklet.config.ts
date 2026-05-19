import type { AukletConfig } from 'auklet';

export const config: AukletConfig = {
  sourceDir: 'src',
  outputDir: 'dist',
  build: {
    formats: ['cjs', 'esm', 'iife'],
    modules: true,
  },
};
