import type { CssOptions } from '@website/infra/css';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  themes: {
    dark: './src/themes/dark.css',
    light: './src/themes/light.css',
  },
};
