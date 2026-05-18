import { ModuleCssBuilder } from '#infra/css/moduleCssBuilder';

// CSS 构建规则：
// - 在 package 根目录执行，存在包级 css.config.ts 时会读取它。
// - 扫描 sourceDir 下所有受支持的样式文件，默认是 src，不只扫描 pages/
//   或 components/。
// - 生成包级聚合 CSS 到 dist/index.css 和 dist/{es,lib}/style/module.css，
//   并递归展开本地 @import。
// - 根据 cssDependencies.global 生成 dist/{es,lib}/style/external.css，
//   并用 dist/{es,lib}/style/index.css 作为外部 + 当前包 CSS 的入口。
// - 为拥有 CSS，或能从源码 import 推导出 CSS 的模块，生成
//   dist/{es,lib}/**/style/index.css 模块级入口。
// - cssDependencies.component 只控制外部包 import 的自动 CSS 推导，例如
//   pages/**.css 或 components/**.css 这类规则。
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
