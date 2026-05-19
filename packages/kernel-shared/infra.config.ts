import type { InfraConfig } from '@website/infra';

export const config: InfraConfig = {
  sourceDir: 'src',
  outputDir: 'dist',
  build: {
    formats: ['cjs', 'esm', 'iife'],
    modules: true,
  },
};
