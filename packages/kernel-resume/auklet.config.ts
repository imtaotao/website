import type { AukletConfig } from 'auklet';

export const config: AukletConfig = {
  modules: true,
  styles: {
    themes: {
      dark: './src/themes/dark.css',
      light: './src/themes/light.css',
    },
  },
};
