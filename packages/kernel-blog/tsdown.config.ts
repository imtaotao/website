import { baseOptions } from '../../tsdown.config';

export default baseOptions(import.meta.url, ['cjs', 'esm', 'iife'], {
  modules: true,
});
