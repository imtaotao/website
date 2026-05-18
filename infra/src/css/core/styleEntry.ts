import path from 'node:path';
import { isArray } from 'aidly';
import { normalizeCssFileKey } from '#infra/css/core/path';
import type { CssOptions } from '#infra/css/core/types';
import { getSourceModuleDir } from '#infra/utils';

export const KERNEL_PACKAGE_PREFIX = '@website-kernel/';
export const STYLE_ENTRY = 'style.css';
export const EXTERNAL_ENTRY = 'external.css';
export const MODULE_ENTRY = 'module.css';
export const THEMES_DIR = 'themes';
export const THEMES_ENTRY_PREFIX = 'themes/';

export type PackageStyleSpecifier = {
  packageName: string;
  stylePath: string;
};

export const groupStyleFilesByDir = (
  sourceRoot: string,
  styleFiles: Array<string>,
) => {
  const styleFilesByDir = new Map<string, Array<string>>();
  for (const styleFile of styleFiles) {
    const sourceRelative = path.relative(sourceRoot, styleFile);
    const sourceDir = getSourceModuleDir(sourceRelative);
    const values = styleFilesByDir.get(sourceDir) ?? [];
    values.push(styleFile);
    styleFilesByDir.set(sourceDir, values);
  }
  return styleFilesByDir;
};

export const getGlobalStyleDependencies = (cssOptions: CssOptions) => {
  const dependencies: Array<string> = [];
  for (const [packageName, dependency] of Object.entries(
    cssOptions.cssDependencies ?? {},
  )) {
    const globalDependencies = isArray(dependency.global)
      ? dependency.global
      : [dependency.global].filter((value): value is string => Boolean(value));

    for (const globalDependency of globalDependencies) {
      dependencies.push(joinDependencySpecifier(packageName, globalDependency));
    }
  }
  return dependencies;
};

export const getExternalStyleDependencies = (cssOptions: CssOptions) => {
  return getGlobalStyleDependencies(cssOptions);
};

export const getThemeStyleDependencies = (
  cssOptions: CssOptions,
  themeName: string,
) => {
  const dependencies: Array<string> = [];
  for (const [packageName, dependency] of Object.entries(
    cssOptions.cssDependencies ?? {},
  )) {
    const themeDependency = dependency.themes?.[themeName];
    if (!themeDependency) continue;
    dependencies.push(joinDependencySpecifier(packageName, themeDependency));
  }
  return dependencies;
};

export const getThemeStyleEntries = (cssOptions: CssOptions) => {
  return Object.entries(cssOptions.themes ?? {}).map(([themeName, file]) => ({
    themeName,
    file,
  }));
};

export const resolveThemeStyleFiles = (
  cssOptions: CssOptions,
  packageRoot: string,
) => {
  const themeFiles = new Map<string, string>();
  for (const { themeName, file } of getThemeStyleEntries(cssOptions)) {
    themeFiles.set(themeName, path.resolve(packageRoot, file));
  }
  return themeFiles;
};

export const createStyleFileKeySet = (styleFiles: Iterable<string>) => {
  return new Set(Array.from(styleFiles, normalizeCssFileKey));
};

export const createStyleFileKey = (styleFile: string) => {
  return normalizeCssFileKey(styleFile);
};

export const parsePackageStyleSpecifier = (
  specifier: string,
): PackageStyleSpecifier | null => {
  if (specifier.startsWith('.')) return null;

  const parts = specifier.split('/');
  const packageName = specifier.startsWith('@')
    ? `${parts.shift() ?? ''}/${parts.shift() ?? ''}`
    : parts.shift() ?? '';
  if (!packageName) return null;

  return {
    packageName,
    stylePath: parts.join('/'),
  };
};

export const joinDependencySpecifier = (
  packageName: string,
  dependencyPath: string,
) => {
  if (!dependencyPath) return packageName;
  return dependencyPath.startsWith('/')
    ? `${packageName}${dependencyPath}`
    : `${packageName}/${dependencyPath}`;
};

export const createImportCode = (specifiers: Array<string>) => {
  return Array.from(new Set(specifiers))
    .map((specifier) => `@import "${specifier}";`)
    .join('\n');
};

export const removeCssExtension = (cssPath: string) => {
  return cssPath.slice(0, -path.extname(cssPath).length);
};
