# CSS 开发模式讨论记录

这个文档记录 `infra build-css` 后续补充 Vite 开发模式支持时的设计方向。目标是让 `app` 在开发环境中直接消费 `packages` 源码 CSS，并保持和生产环境 CSS 构建产物一致的语义。

## 背景

当前 TypeScript 代码通过 `tsconfig.paths` 让 `app` 在开发时解析到 `packages/*/src`，从而获得源码级热更新。CSS 仍主要使用 package exports 形式，例如：

```ts
import '@website-kernel/resume/external.css';
import '@website-kernel/resume/pages/ResumeMobile.css';
```

这些导入在 package 里指向 `dist` 产物。开发时如果只改源码 CSS 或源码模块关系，容易出现热更新不及时，或者需要依赖 `infra build-css` 重新生成产物的问题。

## 目标

- 开发环境不写入 `dist`。
- CSS dev 解析尽量复用 `infra build-css` 的规则，避免开发和生产语义分叉。
- `@website-kernel/*/*.css` 这类 CSS package exports 在 Vite dev 下解析到源码或虚拟 CSS 模块。
- 真实源码 CSS 由 Vite 直接加载，保证 CSS 内容改动可以触发 HMR。
- CSS 依赖图结构变化时先允许 full reload，后续再优化为精确失效。

## 虚拟 CSS 模块

虚拟 CSS 模块不是磁盘上的实体文件，而是 Vite 插件在内存里声明的模块：

1. `resolveId` 拦截 CSS package import。
2. 插件把导入 id 映射为内部虚拟 id。
3. `load` 针对虚拟 id 返回 CSS 字符串。
4. CSS 字符串内部继续 `@import` 真实源码 CSS 或其他虚拟 CSS 入口。

这样可以保留生产产物的入口结构，又不需要在开发环境生成 `dist` 文件。

## 需要对齐的生产语义

### 包级入口

生产环境里：

```css
/* @website-kernel/pkg/style.css */
@import "./external.css";
@import "./module.css";
```

开发环境也应该保持相同顺序，虚拟生成：

```css
@import "virtual:website-kernel-css/@website-kernel/pkg/external.css";
@import "virtual:website-kernel-css/@website-kernel/pkg/module.css";
```

### 外部依赖入口

`@website-kernel/pkg/external.css` 来自包内 `infra.config.ts` 的 `cssDependencies.global`。

- 对 workspace 内 kernel 包，继续解析到该包的虚拟 `external.css` 或对应入口。
- 对普通外部依赖，例如 `katex/dist/katex.min.css`，保留标准 package import，让 Vite 自己解析。

这部分需要沿用 `WorkspaceStyleResolver.toExternalStyleSpecifier()` 的转换语义。

### 当前包模块聚合入口

生产环境的 `module.css` 会聚合当前包所有源码 CSS，并递归展开本地 `@import`。

开发环境不建议直接展开 CSS 内容，而是生成一组 `@import` 指向真实源码 CSS：

```css
@import "/abs/packages/kernel-pkg/src/pages/A/index.css";
@import "/abs/packages/kernel-pkg/src/components/B/index.css";
```

为了避免和生产聚合语义偏离，生成列表时应排除被其他 CSS 通过相对 `@import` 引入的文件，逻辑可复用 `StyleProcessor.collectImportedStyleFiles()`。

### 模块级 CSS 入口

生产环境的 `@website-kernel/pkg/pages/X.css` 指向 `dist/{es,lib}/pages/X/style/index.css`。这个入口可能包含：

- 从 TS/TSX import 推导出来的依赖样式。
- 当前源码模块自己的 CSS。

开发环境也应该虚拟生成模块级入口，而不是简单直连 `src/pages/X/index.css`。这样才能覆盖 `ModuleStyleImportCollector` 推导出的跨模块样式依赖。

## HMR 策略

- CSS 内容变化：真实源码 CSS 被虚拟 CSS 入口 `@import`，由 Vite 自带 CSS HMR 处理。
- 新增或删除 CSS 文件：需要使相关虚拟入口失效，可先 full reload。
- TS/TSX import 变化：会影响模块级 CSS 自动推导，可先 full reload。
- `infra.config.ts` 变化：会影响外部 CSS 入口，可先 full reload。

后续可以维护虚拟模块到源码文件的依赖关系，在 `server.moduleGraph` 中精确失效，减少 full reload。

## 实现原则

- 不要复制一套独立 CSS 语义到 Vite 插件里。
- 优先抽取 `infra build-css` 中“生成 CSS 入口图”的纯逻辑，构建命令负责写文件，Vite 插件负责返回虚拟 CSS code。
- 可复用能力包括：
  - `infra.config.ts` 读取。
  - `fileWalker` 和样式文件筛选。
  - `StyleProcessor.collectImportedStyleFiles()`。
  - `ModuleStyleImportCollector`。
  - `WorkspaceStyleResolver` 的 package CSS specifier 转换规则。

## 当前拆分进展

- 当前写入 `dist` 的生产构建逻辑放在 `infra/src/css/production/`。
- `infra/src/css/` 根目录保留未来 Vite 插件也需要复用的配置、解析、样式处理和 import 收集能力。
- `infra build-css --watch` 已支持监听当前包的 `sourceDir` 和 `infra.config.ts`，变更后重新执行生产 CSS 构建。这个 watch 仍然写入 `dist`，是现有产物构建的开发辅助，不是最终的 Vite 虚拟 CSS dev mode。

## 初步实施顺序

1. 抽出 CSS 入口图生成逻辑，不改变现有 `infra build-css` 行为。
2. 增加 Vite 插件，支持 `style.css`、`external.css` 和模块级 `*.css` 的虚拟入口。
3. 在 dev server 中监听 `packages/kernel-*/src/**/*.{ts,tsx,css,less}` 和 `packages/kernel-*/infra.config.ts`。
4. 先用 full reload 处理依赖图结构变化，确认生产和开发样式语义一致后再优化 HMR 粒度。
