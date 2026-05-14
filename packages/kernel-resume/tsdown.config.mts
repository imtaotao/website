import { baseOptions } from '../../tsdown.config.ts';

export default baseOptions(import.meta.url, ['cjs', 'esm', 'iife'], {
  modules: true,
});
