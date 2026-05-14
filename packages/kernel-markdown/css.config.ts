import type { CssOptions } from '@website/infra/css';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  cssDependencies: {
    katex: {
      global: '/dist/katex.min.css',
    },
  },
};
