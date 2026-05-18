const websiteKernelCssDependency = {
  global: '/style.css',
  component: ['/pages/**.css', '/components/**.css'],
  themes: {
    dark: '/themes/dark.css',
    light: '/themes/light.css',
  },
};

module.exports = {
  websiteKernelCssDependency,
};
