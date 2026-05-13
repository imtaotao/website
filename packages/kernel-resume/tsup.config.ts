import { baseOptions } from '@website/infra/tsup.config';

export const tsup: unknown = baseOptions(import.meta.url, [
  'cjs',
  'esm',
  'iife',
]);
