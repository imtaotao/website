import type { CssDependencyGroup } from '#infra/types';

export const websiteKernelCssDependency: CssDependencyGroup = {
  global: '/style.css',
  component: ['/pages/**.css', '/components/**.css'],
  themes: {
    dark: '/themes/dark.css',
    light: '/themes/light.css',
  },
};
