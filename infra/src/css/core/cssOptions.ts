import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import type { CssOptions } from '#infra/css/core/types';

const importCssOptionsModule = async (configPath: string, href: string) => {
  try {
    return (await import(href)) as Record<string, unknown>;
  } catch (error) {
    if (!isUnknownTsExtensionError(error) || !configPath.endsWith('.ts')) {
      throw error;
    }
    return importTranspiledCssOptionsModule(configPath);
  }
};

const importTranspiledCssOptionsModule = async (configPath: string) => {
  const source = fs.readFileSync(configPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: configPath,
  });
  const code = `${output.outputText}\n//# sourceURL=${
    pathToFileURL(configPath).href
  }`;
  const href = `data:text/javascript;base64,${Buffer.from(code).toString(
    'base64',
  )}`;
  return (await import(href)) as Record<string, unknown>;
};

const isUnknownTsExtensionError = (error: unknown) => {
  return (
    error instanceof TypeError &&
    'code' in error &&
    error.code === 'ERR_UNKNOWN_FILE_EXTENSION'
  );
};

const asRecord = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

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

  if (configPath.endsWith('.ts')) {
    const module = await importTranspiledCssOptionsModule(configPath);
    return resolveCssOptionsModule(module);
  }

  const module = await importCssOptionsModule(configPath, url.href);
  return resolveCssOptionsModule(module);
}
