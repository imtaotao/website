import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CssOptions } from '#infra/css/types';

export function resolveCssOptionsModule(module: Record<string, unknown>) {
  const candidates = [
    module,
    asRecord(module.default),
    asRecord(module['module.exports']),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const config = asRecord(candidate.config);
    if (config) {
      return config as CssOptions;
    }
  }
  return {};
}

export async function loadCssOptions(
  packageRoot: string,
  cssConfigFile: string,
  options: { cacheBust?: boolean } = {},
) {
  const configPath = path.join(packageRoot, cssConfigFile);
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const url = pathToFileURL(configPath);
  if (options.cacheBust) {
    url.searchParams.set('t', Date.now().toString());
  }

  const module = await import(url.href);
  return resolveCssOptionsModule(module);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
