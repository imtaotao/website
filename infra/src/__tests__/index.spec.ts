import { describe, expect, test } from 'vitest';
import * as infra from '#infra/index';

describe('@website/infra public api', () => {
  test('exports runtime APIs from the root entry', () => {
    expect(infra.websiteKernelCssDependency.global).toBe('/style.css');
    expect(infra.websiteKernelCssPlugin).toEqual(expect.any(Function));
    expect(infra.ModuleCssBuilder).toEqual(expect.any(Function));
    expect(infra.ModuleCssWatcher).toEqual(expect.any(Function));
    expect(infra.createTsdownArgs).toEqual(expect.any(Function));
    expect(infra.runTsdown).toEqual(expect.any(Function));
  });

  test('does not expose tsdown config file helpers from the root entry', () => {
    expect('defineKernelPackageConfigFromFile' in infra).toBe(false);
    expect('defineKernelPackageConfigFromOptions' in infra).toBe(false);
  });
});
