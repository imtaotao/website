import { describe, expect, test } from 'vitest';
import { normalizeCssFileKey, toCssFsSpecifier } from '#infra/css/core/path';

describe('css path helpers', () => {
  test('normalizes Windows style paths to stable slash keys', () => {
    expect(
      normalizeCssFileKey(
        'C:\\repo\\website\\packages\\kernel-blog\\src\\index.css',
      ),
    ).toBe('C:/repo/website/packages/kernel-blog/src/index.css');
  });

  test('creates Vite fs specifiers with slash paths', () => {
    expect(
      toCssFsSpecifier(
        'C:\\repo\\website\\packages\\kernel-blog\\src\\index.css',
      ),
    ).toBe('/@fs/C:/repo/website/packages/kernel-blog/src/index.css');
  });
});
