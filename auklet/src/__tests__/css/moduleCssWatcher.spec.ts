import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const events = new Map<string, (...args: Array<unknown>) => void>();
  const close = vi.fn().mockResolvedValue(undefined);
  const watch = vi.fn(() => ({
    close,
    on: vi.fn((event: string, callback: (...args: Array<unknown>) => void) => {
      events.set(event, callback);
      return undefined;
    }),
  }));
  const build = vi.fn().mockResolvedValue(undefined);
  const builderContexts: Array<Record<string, unknown>> = [];

  return {
    build,
    builderContexts,
    close,
    events,
    watch,
  };
});

vi.mock('chokidar', () => ({
  default: {
    watch: mocks.watch,
  },
}));

vi.mock('#auklet/css/production/moduleCssBuilder', () => ({
  ModuleCssBuilder: vi.fn((context: Record<string, unknown>) => {
    mocks.builderContexts.push(context);
    return {
      build: mocks.build,
    };
  }),
}));

import { ModuleCssWatcher } from '#auklet/css/watch/moduleCssWatcher';
import type { AukletConfig, AukletLogger } from '#auklet/types';

describe('ModuleCssWatcher', () => {
  let tempRoot: string;
  let logger: Required<AukletLogger>;

  beforeEach(() => {
    vi.useFakeTimers();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auklet-watcher-'));
    logger = {
      log: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
    mocks.build.mockClear();
    mocks.builderContexts.length = 0;
    mocks.close.mockClear();
    mocks.events.clear();
    mocks.watch.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('watches configured source root and auklet config file', async () => {
    const aukletConfig: AukletConfig = {
      sourceDir: 'source',
    };
    writeFile('source/index.tsx', 'export const value = 1;');
    writeFile('auklet.config.ts', 'export const config = {};');

    const watcher = new ModuleCssWatcher({
      packageRoot: tempRoot,
      aukletConfig,
      logger,
    });

    await watcher.watch();

    expect(mocks.builderContexts[0]).toMatchObject({
      packageRoot: tempRoot,
      aukletConfig,
      logger,
    });
    expect(mocks.watch).toHaveBeenCalledWith(
      [path.join(tempRoot, 'source'), path.join(tempRoot, 'auklet.config.ts')],
      {
        ignoreInitial: true,
        interval: 300,
        usePolling: true,
      },
    );
    expect(logger.log).toHaveBeenCalledWith('[auklet:css] watch mode ready');

    await watcher.close();
  });

  test('debounces file events into a rebuild', async () => {
    writeFile('src/index.tsx', 'export const value = 1;');
    const watcher = new ModuleCssWatcher({
      packageRoot: tempRoot,
      logger,
    });

    await watcher.watch();
    mocks.events.get('all')?.();
    mocks.events.get('all')?.();
    await vi.advanceTimersByTimeAsync(80);

    expect(mocks.build).toHaveBeenCalledTimes(2);

    await watcher.close();
  });

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
});
