import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { moduleCssBuildConfig } from '#infra/css/config';
import { WorkspaceStyleResolver } from '#infra/css/workspaceStyleResolver';

describe('WorkspaceStyleResolver', () => {
  let tempRoot: string;
  let resolver: WorkspaceStyleResolver;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-resolver-'));
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: 'fixture-package' }),
    );

    resolver = new WorkspaceStyleResolver(moduleCssBuildConfig, {
      packageRoot: tempRoot,
      sourceDir: path.join(tempRoot, 'src'),
      outputDir: path.join(tempRoot, 'dist'),
    });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('resolves relative style dependencies from the importing directory', () => {
    const fromDir = path.join(tempRoot, 'src/components/Button');

    expect(resolver.resolveStyleDependency('./index.css', fromDir)).toBe(
      path.join(fromDir, 'index.css'),
    );
  });

  test('resolves package style dependencies with Node resolution first', () => {
    const packageStyle = path.join(
      tempRoot,
      'node_modules/@scope/ui/style.css',
    );
    fs.mkdirSync(path.dirname(packageStyle), { recursive: true });
    fs.writeFileSync(packageStyle, '');

    expect(
      fs.realpathSync(resolver.resolveStyleDependency('@scope/ui/style.css')),
    ).toBe(fs.realpathSync(packageStyle));
  });

  test('resolves package exports for stable style entry paths', () => {
    const packageRoot = path.join(tempRoot, 'node_modules/@scope/ui');
    const styleFile = path.join(
      packageRoot,
      'dist/lib/components/Button/style/index.css',
    );
    fs.mkdirSync(path.dirname(styleFile), { recursive: true });
    fs.writeFileSync(styleFile, '');
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@scope/ui',
        exports: {
          './*.css': {
            import: './dist/es/*/style/index.css',
            require: './dist/lib/*/style/index.css',
            default: './dist/es/*/style/index.css',
          },
        },
      }),
    );

    expect(
      fs.realpathSync(
        resolver.resolveStyleDependency('@scope/ui/components/Button.css'),
      ),
    ).toBe(fs.realpathSync(styleFile));
  });

  test('falls back to package node_modules path when Node resolution misses', () => {
    expect(resolver.resolveStyleDependency('@scope/ui/missing.css')).toBe(
      path.join(tempRoot, 'node_modules/@scope/ui/missing.css'),
    );
  });

  test('rewrites package style specifiers to the current output format', () => {
    const outRoot = path.join(tempRoot, 'dist/lib');

    expect(
      resolver.toOutputStyleSpecifier(
        '@scope/ui/es/components/Button/style/index.css',
        outRoot,
      ),
    ).toBe('@scope/ui/lib/components/Button/style/index.css');
  });

  test('keeps relative and non-output package specifiers unchanged', () => {
    const outRoot = path.join(tempRoot, 'dist/lib');

    expect(resolver.toOutputStyleSpecifier('../Button.css', outRoot)).toBe(
      '../Button.css',
    );
    expect(
      resolver.toOutputStyleSpecifier('@scope/ui/style.css', outRoot),
    ).toBe('@scope/ui/style.css');
  });

  test('rewrites package style entry specifiers to external style entries', () => {
    const outRoot = path.join(tempRoot, 'dist/lib');

    expect(
      resolver.toExternalStyleSpecifier('@scope/ui/style.css', outRoot),
    ).toBe('@scope/ui/external.css');
    expect(
      resolver.toExternalStyleSpecifier(
        '@scope/ui/es/style/index.css',
        outRoot,
      ),
    ).toBe('@scope/ui/lib/style/external.css');
    expect(
      resolver.toExternalStyleSpecifier('katex/dist/katex.min.css', outRoot),
    ).toBe('katex/dist/katex.min.css');
  });
});
