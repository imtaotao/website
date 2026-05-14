import type { ModuleCssBuildConfig } from '#infra/css/types';

const CSS_LANGUAGE = 'css';
const LESS_LANGUAGE = 'less';
const CSS_EXTENSION = '.css';
const LESS_EXTENSION = '.less';

export const moduleCssBuildConfig: ModuleCssBuildConfig = {
  output: {
    styleDir: 'style',
    indexCssFile: 'index.css',
    moduleCssFile: 'module.css',
    externalCssFile: 'external.css',
    outputFormats: ['es', 'lib'],
  },
  cssConfigFile: 'css.config.ts',
  lessLanguage: LESS_LANGUAGE,
  styleExtensions: {
    [CSS_EXTENSION]: CSS_LANGUAGE,
    [LESS_EXTENSION]: LESS_LANGUAGE,
  },
};
