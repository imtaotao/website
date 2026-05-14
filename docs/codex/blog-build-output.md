# Blog 包构建产物契约

本文记录 `packages/kernel-blog/` 当前构建产物结构。后续调整构建脚本时，除非明确迁移调用方，否则需要保持这些入口和文件布局兼容。

## 构建入口

- 包名：`@website-kernel/blog`
- 构建命令：`pnpm --filter @website-kernel/blog run build`
- 包内构建流程：
  - `rimraf dist`
  - `tsdown --config ./tsdown.config.ts`
  - `infra build-css`
- `packages/kernel-blog/tsdown.config.ts` 通过根目录 `tsdown.config.ts` 的 `baseOptions` 产出根 bundle。样式后处理配置放在 `packages/kernel-blog/css.config.ts`。Tailwind 相关处理使用根目录 `tailwind.config.js` 对应的共享配置。

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
    "./*/style.css": {
      "import": "./dist/es/*/style/index.css",
      "require": "./dist/lib/*/style/index.css",
      "default": "./dist/es/*/style/index.css"
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
    "./style.css": "./dist/index.css"
  },
  "files": ["dist"],
  "sideEffects": ["**/*.css"]
}
```

## dist 根目录

`dist/` 根目录由 `tsdown` 产出兼容不同消费方式的 bundle：

- `dist/index.js`
- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.global.js`
- `dist/index.css`

其中 `dist/index.css` 是扁平化样式入口，会内联 `@website-kernel/markdown/style.css` 解析后的内容，以及 blog 包自身 CSS 内容。

## 模块化产物

`@website/infra` 的 `infra build-css` 命令会额外生成两套模块化 CSS 产物：

- `dist/es/`：ES module，内部源码别名会改写为相对 `*.js` import。
- `dist/lib/`：CommonJS，内部源码别名会改写为相对 `*.js` require。

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

## 样式产物

每个 `src/**/*.css` 会复制到两套模块化目录：

- `dist/es/<source-relative>.css`
- `dist/lib/<source-relative>.css`

同时，有同级模块源码的 CSS 文件所在目录会生成一个模块级样式入口：

- `dist/es/<source-css-dir>/style/index.css`
- `dist/lib/<source-css-dir>/style/index.css`

当前 blog 包的模块级样式入口包括：

- `components/BlogThemeToggle/style/index.css`
- `pages/BlogArticlePage/style/index.css`
- `pages/BlogHomePage/style/index.css`

这些模块级入口默认 import 同目录 CSS，例如：

```text
@import "../index.css";
```

`pages/BlogArticlePage/style/index.css` 还必须额外 import markdown 渲染器和 Lightbox 的稳定样式入口：

```text
@import "@website-kernel/markdown/components/Lightbox/style.css";
@import "@website-kernel/markdown/components/Renderer/style.css";
@import "../index.css";
```

模块化总样式入口也需要同时存在：

- `dist/es/style/index.css`
- `dist/lib/style/index.css`

这两个文件保留对 markdown 总样式的 workspace import，并内联 blog 自身 CSS：

```text
@import "@website-kernel/markdown/style.css";
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

单元测试重点覆盖：

- PostCSS AST 解析 `@import`，并内联相对 CSS 依赖。
- 同目录 CSS 和 JS 引用外部组件时生成模块级 `style/index.css`。
- 支持具名导入、别名导入、deep import，以及 page/component 这类任意目录规则。
- 禁止从包入口使用 namespace import 自动推导 CSS。
- 通过 package exports 解析稳定的 `@scope/pkg/components/Button/style.css` 入口。
