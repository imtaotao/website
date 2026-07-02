export const config = {
  modules: true,
  styles: {
    shared: './src/pages/Page.css',
    themes: {
      dark: './src/themes/dark.css',
      light: './src/themes/light.css',
    },
    dependencies: {
      willa: {
        entry: 'external.css',
        components: '*.css',
        themes: {
          dark: 'themes/dark.css',
          light: 'themes/light.css',
        },
      },
    },
  },
};
