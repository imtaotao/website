import type { CssOptions } from '@website/infra/css';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  cssDependencies: {
    '@website-kernel': {
      global: '/markdown/style.css',
      component: '/*/es/components/**/style/index.css',
    },
  },
};
