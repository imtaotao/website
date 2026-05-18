import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';
import { ModuleCssWatcher } from '#infra/css/watch/moduleCssWatcher';

const shouldWatch =
  process.argv.includes('--watch') || process.argv.includes('-w');

const context = {
  packageRoot: process.cwd(),
};

if (shouldWatch) {
  const watcher = new ModuleCssWatcher(context);
  await watcher.watch();
} else {
  const builder = new ModuleCssBuilder(context);
  await builder.build();
}
