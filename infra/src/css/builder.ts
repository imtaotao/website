import { ModuleCssBuilder } from '#infra/css/production/moduleCssBuilder';

const shouldWatch =
  process.argv.includes('--watch') || process.argv.includes('-w');

const builder = new ModuleCssBuilder({
  packageRoot: process.cwd(),
});

if (shouldWatch) {
  await builder.watch();
} else {
  await builder.build();
}
