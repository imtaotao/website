import type { CssOptions } from '@website/infra/css';
import { websiteKernelCssDependency } from '@website/infra/css/config';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  themes: {
    dark: './src/themes/dark.css',
    light: './src/themes/light.css',
  },
  cssDependencies: {
    '@website-kernel/markdown': websiteKernelCssDependency,
  },
};
