# Blog 包构建产物契约

本文记录 `packages/kernel-blog/` 当前构建产物结构。后续调整构建脚本时，除非明确迁移调用方，否则需要保持这些入口和文件布局兼容。

## 构建入口

- 包名：`@website-kernel/blog`
- 构建命令：`pnpm --filter @website-kernel/blog run build`
- 包内构建流程：
  - `rimraf dist`
  - `tsdown --config ./tsdown.config.ts`
  - `infra build-css`
- `packages/kernel-blog/tsdown.config.ts` 复用根目录 `tsdown.config.ts` 的 `baseOptions`。
- JS 和类型产物由 `tsdown` 负责，CSS 入口和 CSS 依赖链由 `infra build-css` 负责。
- CSS 依赖规则配置在 `packages/kernel-blog/css.config.ts`。

## package.json 对外入口

`packages/kernel-blog/package.json` 当前需要保持这些字段语义：

```json
{
  "main": "./dist/lib/index.js",
  "module": "./dist/es/index.js",
  "unpkg": "./dist/index.global.js",
  "types": "./dist/es/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/es/index.d.ts",
        "default": "./dist/es/index.js"
      },
      "require": {
        "types": "./dist/lib/index.d.ts",
        "default": "./dist/lib/index.js"
      }
    },
    "./*": {
      "import": {
        "types": "./dist/es/*/index.d.ts",
        "default": "./dist/es/*/index.js"
      },
      "require": {
        "types": "./dist/lib/*/index.d.ts",
        "default": "./dist/lib/*/index.js"
      }
    },
    "./*.css": {
      "import": "./dist/es/*/style/index.css",
      "require": "./dist/lib/*/style/index.css",
      "default": "./dist/es/*/style/index.css"
    },
    "./style.css": {
      "import": "./dist/es/style/index.css",
      "require": "./dist/lib/style/index.css",
      "default": "./dist/es/style/index.css"
    },
    "./external.css": {
      "import": "./dist/es/style/external.css",
      "require": "./dist/lib/style/external.css",
      "default": "./dist/es/style/external.css"
    }
  },
  "files": ["dist"],
  "sideEffects": ["**/*.css"]
}
```

调用方推荐按需引入页面或组件样式：

```ts
import '@website-kernel/blog/external.css';
import '@website-kernel/blog/pages/BlogHomePage.css';
```

## dist 根目录

`dist/` 根目录由 `tsdown` 和 `infra build-css` 共同产出：

- `dist/index.js`
- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.global.js`
- `dist/index.css`

其中 `dist/index.css` 是给原生 HTML `<link>` 等场景使用的扁平化样式文件，会内联 blog 自身 CSS，以及 `cssDependencies.global` 指定的外部全局 CSS 内容。

`dist/index.css` 当前不作为 package exports 入口；包导出的 `./style.css` 指向模块化总样式入口 `dist/{es,lib}/style/index.css`。

## 模块化 JS 产物

开启 `baseOptions(..., { modules: true })` 后，`tsdown` 会额外生成两套 unbundle 产物：

- `dist/es/`：ES module。
- `dist/lib/`：CommonJS。

每个非测试 TypeScript 源文件都需要在 `dist/es/` 和 `dist/lib/` 下有同路径的 `.js` 与 `.d.ts`：

- `src/index.ts` -> `dist/{es,lib}/index.js` + `index.d.ts`
- `src/articleSchema.ts` -> `dist/{es,lib}/articleSchema.js` + `articleSchema.d.ts`
- `src/articleTypes.ts` -> `dist/{es,lib}/articleTypes.js` + `articleTypes.d.ts`
- `src/tagHelpers.ts` -> `dist/{es,lib}/tagHelpers.js` + `tagHelpers.d.ts`
- `src/tags.ts` -> `dist/{es,lib}/tags.js` + `tags.d.ts`
- `src/components/BlogThemeToggle/BlogThemeToggle.tsx` -> `dist/{es,lib}/components/BlogThemeToggle/BlogThemeToggle.js` + `.d.ts`
- `src/pages/BlogArticlePage/index.tsx` -> `dist/{es,lib}/pages/BlogArticlePage/index.js` + `.d.ts`
- `src/pages/BlogHomePage/index.tsx` -> `dist/{es,lib}/pages/BlogHomePage/index.js` + `.d.ts`

`src/__tests__/` 不属于发布产物契约。

## 模块化 CSS 产物

每个 `src/**/*.css` 会复制到两套模块化目录：

- `dist/es/<source-relative>.css`
- `dist/lib/<source-relative>.css`

包级 CSS 入口需要同时存在：

- `dist/{es,lib}/style/external.css`
- `dist/{es,lib}/style/module.css`
- `dist/{es,lib}/style/index.css`

`external.css` 是稳定外部依赖入口。即使当前包没有外部 CSS 依赖，也必须生成空文件。blog 包当前会生成：

```css
@import '@website-kernel/markdown/external.css';
```

`module.css` 聚合当前包自己的 CSS 内容。

`style/index.css` 是包级总入口，只 import 自己的两份 CSS：

```css
@import './external.css';
@import './module.css';
```

有同级模块源码的 CSS 文件所在目录会生成模块级样式入口：

- `dist/es/<source-css-dir>/style/index.css`
- `dist/lib/<source-css-dir>/style/index.css`

当前 blog 包的模块级样式入口包括：

- `components/BlogThemeToggle/BlogThemeToggle/style/index.css`
- `pages/BlogArticlePage/style/index.css`
- `pages/BlogHomePage/style/index.css`

这些模块级入口只描述组件和页面自身的样式依赖，不自动 import 包级 `external.css`。调用方如果按需引入单组件样式，需要自己额外引入包级 `external.css`。

示例：

```css
@import '@website-kernel/markdown/components/Lightbox.css';
@import '@website-kernel/markdown/components/Renderer.css';
@import '../../../components/BlogThemeToggle/BlogThemeToggle/style/index.css';
@import '../../BlogHomePage/style/index.css';
@import '../index.css';
```

## 验证命令

产物结构的通用能力由 `@website/infra` 的单元测试覆盖：

```shell
pnpm --filter @website/infra run test
```

涉及 blog 包产物调整时，再运行实际构建：

```shell
pnpm --filter @website-kernel/blog run build
```

涉及 app 引入方式调整时，运行：

```shell
pnpm --filter @website/app run build
```

单元测试重点覆盖：

- PostCSS AST 解析 `@import`，并内联相对 CSS 依赖。
- 生成稳定的 `external.css`、`module.css` 和 `style/index.css`。
- 没有外部 CSS 依赖时也生成空的 `external.css`。
- 同目录 CSS 和 JS 引用外部组件时生成模块级 `style/index.css`。
- 支持具名导入、别名导入、deep import，以及 page/component 这类任意目录规则。
- 禁止从包入口使用 namespace import 自动推导 CSS。
- 通过 package exports 解析稳定的 `@scope/pkg/components/Button.css` 入口。
