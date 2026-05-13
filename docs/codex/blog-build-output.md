# Blog 包构建产物契约

本文记录 `packages/kernel-blog/` 当前构建产物结构。后续调整构建脚本时，除非明确迁移调用方，否则需要保持这些入口和文件布局兼容。

## 构建入口

- 包名：`@website-kernel/blog`
- 构建命令：`pnpm --filter @website-kernel/blog run build`
- 包内构建流程：
  - `rimraf dist`
  - `tsdown --config ./tsdown.config.ts`
  - `website-package-modules`
- `packages/kernel-blog/tsdown.config.ts` 通过根目录 `tsdown.config.ts` 的 `baseOptions` 产出根 bundle。样式后处理配置放在 `packages/kernel-blog/packageBuild.config.ts`。Tailwind 相关处理使用根目录 `tailwind.config.js` 对应的共享配置。

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
    "./es/*": "./dist/es/*",
    "./lib/*": "./dist/lib/*",
    "./style/*": "./dist/es/style/*",
    "./style.css": "./dist/es/style/index.css",
    "./style/index.css": "./dist/es/style/index.css"
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

`@website/infra` 的 `website-package-modules` 命令会额外生成两套模块化产物：

- `dist/es/`：ES module，内部源码别名会改写为相对 `*.js` import。
- `dist/lib/`：CommonJS，内部源码别名会改写为相对 `*.js` require。

每个非测试 TypeScript 源文件都需要在 `dist/es/` 和 `dist/lib/` 下有同路径的 `.js` 与 `.d.ts`：

- `src/index.ts` -> `dist/{es,lib}/index.js` + `index.d.ts`
- `src/articleSchema.ts` -> `dist/{es,lib}/articleSchema.js` + `articleSchema.d.ts`
- `src/articleTypes.ts` -> `dist/{es,lib}/articleTypes.js` + `articleTypes.d.ts`
- `src/tagHelpers.ts` -> `dist/{es,lib}/tagHelpers.js` + `tagHelpers.d.ts`
- `src/tags.ts` -> `dist/{es,lib}/tags.js` + `tags.d.ts`
- `src/components/BlogThemeToggle/BlogThemeToggle.tsx` -> `dist/{es,lib}/components/BlogThemeToggle/BlogThemeToggle.js` + `.d.ts`
- `src/pages/BlogArticlePage/ArticlePage.tsx` -> `dist/{es,lib}/pages/BlogArticlePage/ArticlePage.js` + `.d.ts`
- `src/pages/BlogHomePage/HomePage.tsx` -> `dist/{es,lib}/pages/BlogHomePage/HomePage.js` + `.d.ts`

`src/__tests__/` 不属于发布产物契约。

## 样式产物

每个 `src/**/*.css` 会复制到两套模块化目录：

- `dist/es/<source-relative>.css`
- `dist/lib/<source-relative>.css`

同时，每个 CSS 文件所在目录会生成一个组件级样式入口：

- `dist/es/<source-css-dir>/style/index.css`
- `dist/lib/<source-css-dir>/style/index.css`

当前 blog 包的组件级样式入口包括：

- `components/BlogThemeToggle/style/index.css`
- `pages/BlogArticlePage/style/index.css`
- `pages/BlogHomePage/style/index.css`
- `pages/BlogPage/style/index.css`
- `pages/BlogShared/style/index.css`

这些组件级入口默认 import 同目录 CSS，例如：

```text
@import "../HomePage.css";
```

`pages/BlogArticlePage/style/index.css` 还必须额外 import markdown 渲染器和 Lightbox 的样式：

```text
@import "@website-kernel/markdown/es/components/Renderer/style/index.css";
@import "@website-kernel/markdown/es/components/Lightbox/style/index.css";
@import "../ArticlePage.css";
```

模块化总样式入口也需要同时存在：

- `dist/es/style/index.css`
- `dist/lib/style/index.css`

这两个文件保留对 markdown 总样式的 workspace import，并内联 blog 自身 CSS：

```text
@import "@website-kernel/markdown/es/style/index.css";
```

`lib` 目录下的同名样式入口仍然指向当前格式目录对应路径，即：

```text
@import "@website-kernel/markdown/lib/style/index.css";
```

## 验证命令

当前根命令：

```shell
pnpm codex:blog-build-output
```

这个命令只检查现有产物结构，不会自动构建。典型流程是：

```shell
pnpm --filter @website-kernel/blog run build
pnpm codex:blog-build-output
```

命令会检查：

- package 对外入口字段是否仍指向当前 `dist` 布局。
- 根 bundle 是否存在。
- `dist/es` 和 `dist/lib` 是否都有对应 `.js`、`.d.ts`、`.css`。
- 每个 CSS 源文件是否都有组件级 `style/index.css`。
- BlogArticlePage 的组件级样式入口是否保留 markdown 组件样式依赖。
- `dist/{es,lib}/style/index.css` 是否保留 markdown 总样式依赖。
- `dist/` 是否出现当前契约之外的额外文件。
