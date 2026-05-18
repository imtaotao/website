import { tsImport } from 'tsx/esm/api';

const cssModule = await tsImport('./src/css/index.ts', {
  parentURL: import.meta.url,
});

export const websiteKernelCssPlugin = cssModule.websiteKernelCssPlugin;
