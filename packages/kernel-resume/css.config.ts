import type { CssOptions } from '@website/infra/css';

export const config: CssOptions = {
  sourceDir: 'src',
  outputDir: 'dist',
  themes: {
    light: './src/themes/light.css',
    dark: './src/themes/dark.css',
  },
};
