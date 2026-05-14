import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { CssOptions } from '#infra/css/types';
import type { WorkspaceStyleResolver } from '#infra/css/workspaceStyleResolver';
import {
  appendUniqueMapValue,
  SOURCE_DECLARATION_RE,
  POSIX_SEPARATOR,
  SOURCE_MODULE_RE,
} from '#infra/utils';

const GLOBSTAR_TOKEN = '**';

type AutoImportRule = {
  packageName: string;
  outputPattern: string;
};

type SourceImportDeclaration = {
  importPath: string;
  importClause?: ts.ImportClause;
};

export class ModuleStyleImportCollector {
  constructor(
    private readonly srcRoot: string,
    private readonly resolver: WorkspaceStyleResolver,
  ) {}

  collect(files: Array<string>, cssOptions: CssOptions) {
    const entries = new Map<string, Array<string>>();
    const rules = this.createAutoImportRules(cssOptions);

    if (!rules.length) return entries;

    for (const file of files) {
      if (!SOURCE_MODULE_RE.test(file) || SOURCE_DECLARATION_RE.test(file)) {
        continue;
      }

      const sourceDir = path.dirname(path.relative(this.srcRoot, file));
      const code = fs.readFileSync(file, 'utf8');
      const imports = this.getImportDeclarations(file, code);

      for (const item of imports) {
        const importPath = item.importPath;
        const ruleMatch = this.matchAutoImportRule(rules, importPath);

        if (!ruleMatch) continue;

        const directSpecifier = this.createDirectStyleSpecifier(
          ruleMatch.rule,
          importPath,
        );

        if (directSpecifier) {
          const cssFile = this.resolver.resolveStyleDependency(directSpecifier);

          if (fs.existsSync(cssFile)) {
            appendUniqueMapValue(entries, sourceDir, directSpecifier);
          }

          continue;
        }

        const importedNames = this.getImportedNames(file, item);

        for (const importedName of importedNames.length
          ? importedNames
          : ['']) {
          const specifier = this.createStyleSpecifier(
            ruleMatch.rule,
            ruleMatch.values,
            importedName,
          );
          const cssFile = this.resolver.resolveStyleDependency(specifier);

          if (!fs.existsSync(cssFile)) {
            continue;
          }

          appendUniqueMapValue(entries, sourceDir, specifier);
        }
      }
    }

    return entries;
  }

  private getImportDeclarations(file: string, code: string) {
    const imports: Array<SourceImportDeclaration> = [];
    const sourceFile = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      false,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    sourceFile.forEachChild((node) => {
      if (
        !ts.isImportDeclaration(node) ||
        !ts.isStringLiteral(node.moduleSpecifier)
      ) {
        return;
      }

      imports.push({
        importPath: node.moduleSpecifier.text,
        importClause: node.importClause,
      });
    });

    return imports;
  }

  private createAutoImportRules(cssOptions: CssOptions): Array<AutoImportRule> {
    return Object.entries(cssOptions.cssDependencies ?? {})
      .filter((entry): entry is [string, { component: string }] =>
        Boolean(entry[1].component),
      )
      .map(([packageName, dependency]) => {
        return {
          packageName,
          outputPattern: this.joinDependencySpecifier(
            packageName,
            dependency.component,
          ),
        };
      });
  }

  private matchAutoImportRule(
    rules: Array<AutoImportRule>,
    importPath: string,
  ) {
    for (const rule of rules) {
      if (
        importPath !== rule.packageName &&
        !importPath.startsWith(`${rule.packageName}${POSIX_SEPARATOR}`)
      ) {
        continue;
      }

      return {
        rule,
        values: this.getImportPathValues(rule.packageName, importPath),
      };
    }

    return null;
  }

  private getImportPathValues(packageName: string, importPath: string) {
    return importPath
      .slice(packageName.length)
      .replace(new RegExp(`^${POSIX_SEPARATOR}`), '')
      .split(POSIX_SEPARATOR)
      .filter(Boolean);
  }

  private createStyleSpecifier(
    rule: AutoImportRule,
    values: Array<string>,
    importedName: string,
  ) {
    const pathValues = [...values];

    return rule.outputPattern.replace(/\*\*|\*/g, (token) => {
      const matchedValue = pathValues.shift();

      if (matchedValue) {
        return matchedValue;
      }

      if (token === GLOBSTAR_TOKEN) {
        return importedName;
      }

      return matchedValue ?? importedName;
    });
  }

  private createDirectStyleSpecifier(rule: AutoImportRule, importPath: string) {
    const patternParts = rule.outputPattern.split(POSIX_SEPARATOR);
    const globstarIndex = patternParts.indexOf(GLOBSTAR_TOKEN);

    if (globstarIndex < 0) {
      return null;
    }

    const prefixParts = patternParts.slice(0, globstarIndex);
    const suffixParts = patternParts.slice(globstarIndex + 1);
    const importParts = importPath.split(POSIX_SEPARATOR);

    if (importParts.length < prefixParts.length) {
      return null;
    }

    for (let index = 0; index < prefixParts.length; index += 1) {
      const patternPart = prefixParts[index];
      if (patternPart === '*') continue;
      if (patternPart !== importParts[index]) {
        return null;
      }
    }

    return [...importParts, ...suffixParts].join(POSIX_SEPARATOR);
  }

  private joinDependencySpecifier(packageName: string, dependencyPath: string) {
    if (!dependencyPath) return packageName;
    if (dependencyPath.startsWith(POSIX_SEPARATOR)) {
      return `${packageName}${dependencyPath}`;
    }
    return `${packageName}${POSIX_SEPARATOR}${dependencyPath}`;
  }

  private getImportedNames(file: string, item: SourceImportDeclaration) {
    const importClause = item.importClause;
    if (!importClause || importClause.isTypeOnly) {
      return [];
    }

    const names: Array<string> = [];

    if (importClause.name) {
      names.push(importClause.name.text);
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) {
      return names;
    }

    if (ts.isNamespaceImport(namedBindings)) {
      throw new Error(
        `Namespace import is not supported for CSS auto import: ${item.importPath}\n` +
          `Use named imports instead, for example: import { Component } from '${item.importPath}'.\n` +
          `File: ${file}`,
      );
    }

    for (const element of namedBindings.elements) {
      if (element.isTypeOnly) continue;
      names.push((element.propertyName ?? element.name).text);
    }

    return names;
  }
}
