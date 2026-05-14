export type CssDependencyGroup = {
  // 全局 CSS 依赖，会被合并进包级 dist/index.css。
  global?: string | Array<string>;
  // 组件 CSS 自动引用规则，用于从组件 import 推导对应样式入口。
  component?: string;
};

export interface CssOptions {
  // 外部包 CSS 依赖配置，key 是包名前缀，value 是该包的样式依赖规则。
  cssDependencies?: Record<string, CssDependencyGroup>;
  // 源码目录，相对于当前包根目录。
  sourceDir?: string;
  // 构建产物目录，相对于当前包根目录。
  outputDir?: string;
}

export type StyleLanguage = 'css' | 'less';

export interface ModuleCssBuildContext {
  // 当前执行 CSS 构建的包根目录。
  packageRoot: string;
  // 命令行传入的源码目录，会覆盖包内 css.config.ts 的配置。
  sourceDir?: string;
  // 命令行传入的产物目录，会覆盖包内 css.config.ts 的配置。
  outputDir?: string;
}

export interface ResolvedModuleCssBuildContext {
  // 当前执行 CSS 构建的包根目录。
  packageRoot: string;
  // 已解析后的源码目录，使用绝对路径。
  sourceDir: string;
  // 已解析后的产物目录，使用绝对路径。
  outputDir: string;
}

export interface ModuleCssBuildOutputConfig {
  // 需要同步生成 CSS 产物的模块格式目录，例如 es、lib。
  outputFormats: Array<string>;
  // 组件级 CSS 入口目录名，例如 style/index.css 里的 style。
  styleDir: string;
  // CSS 入口文件名，例如 style/index.css 和 dist/index.css 里的 index.css。
  indexCssFile: string;
}

export interface ModuleCssBuildConfig {
  // CSS 产物结构配置。
  output: ModuleCssBuildOutputConfig;
  // 包内 CSS 构建配置文件名。
  cssConfigFile: string;
  // 支持处理的样式文件后缀和对应语言类型。
  styleExtensions: Record<string, StyleLanguage>;
  // Less 文件在构建流程中的语言标识。
  lessLanguage: StyleLanguage;
}
