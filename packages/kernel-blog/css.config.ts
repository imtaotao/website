import type { CssOptions } from '@website/infra/css';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  cssDependencies: {
    '@website-kernel/markdown': {
      global: '/style.css',
      component: ['/pages/**/style.css', '/components/**/style.css'],
    },
  },
};
