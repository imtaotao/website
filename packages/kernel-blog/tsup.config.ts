import { baseOptions } from '../../tsup.config';

export const tsup = baseOptions(import.meta.url, ['cjs', 'esm']).map(
  (config) => ({
    ...config,
    entry: ['src/index.ts', 'src/browser.ts'],
  }),
);
