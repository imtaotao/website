import { ModuleCssBuilder } from '#infra/css/moduleCssBuilder';

export type {
  CssOptions,
  StyleLanguage,
  ModuleCssBuildConfig,
  ModuleCssBuildContext,
} from '#infra/css/types';

const builder = new ModuleCssBuilder({
  packageRoot: process.cwd(),
});

await builder.build();
