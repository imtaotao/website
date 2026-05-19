import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { moduleCssBuildConfig } from '#auklet/css/core/config';
import { StyleProcessor } from '#auklet/css/core/styleProcessor';
import type { WorkspaceStyleResolver } from '#auklet/css/core/workspaceStyleResolver';

describe('StyleProcessor', () => {
  let tempRoot: string;
  let processor: StyleProcessor;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auklet-style-'));

    const resolver = {
      resolveStyleDependency(specifier: string, fromDir: string) {
        if (specifier.startsWith('.')) return path.resolve(fromDir, specifier);
        return path.join(tempRoot, 'node_modules', specifier);
      },
    } as WorkspaceStyleResolver;

    processor = new StyleProcessor(moduleCssBuildConfig, resolver);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('inlines nested CSS imports with PostCSS AST order preserved', () => {
    const entry = writeFile(
      'entry.css',
      `
        @import "./base.css";
        .entry { color: red; }
      `,
    );
    writeFile(
      'base.css',
      `
        @import "./tokens.css";
        .base { color: blue; }
      `,
    );
    writeFile('tokens.css', '.tokens { color: green; }');

    const content = processor.readStyleFile(entry);

    expect(content).not.toContain('@import');
    expect(content).toContain('.tokens { color: green; }');
    expect(content).toContain('.base { color: blue; }');
    expect(content).toContain('.entry { color: red; }');
    expect(content.indexOf('.tokens')).toBeLessThan(content.indexOf('.base'));
    expect(content.indexOf('.base')).toBeLessThan(content.indexOf('.entry'));
  });

  test('inlines url imports and avoids repeating circular imports', () => {
    const entry = writeFile(
      'entry.css',
      `
        @import url("./base.css");
        .entry { color: red; }
      `,
    );
    writeFile(
      'base.css',
      `
        @import url('./entry.css');
        .base { color: blue; }
      `,
    );

    const content = processor.readStyleFile(entry);

    expect(content).not.toContain('@import');
    expect(content.match(/\.entry/g)).toHaveLength(1);
    expect(content.match(/\.base/g)).toHaveLength(1);
  });

  test('collects only relative style imports with supported style extensions', () => {
    const entry = writeFile(
      'entry.css',
      `
        @import "./base.css";
        @import "./theme.less";
        @import "./ignored.txt";
        @import "@scope/ui/style.css";
      `,
    );
    const base = path.join(tempRoot, 'base.css');
    const theme = path.join(tempRoot, 'theme.less');

    const imported = processor.collectImportedStyleFiles([entry]);

    expect(imported).toEqual(new Set([base, theme]));
  });

  test('removes imports whose resolved file does not produce CSS content', () => {
    const entry = writeFile(
      'entry.css',
      `
        @import "./missing.css";
        .entry { color: red; }
      `,
    );

    const content = processor.readStyleFile(entry);

    expect(content).not.toContain('@import');
    expect(content).toContain('.entry { color: red; }');
  });

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
});
