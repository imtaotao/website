# @website/infra

这个包放 workspace 构建相关的共享实现。

- `@website/infra/tsup.config`：各 `packages/kernel-*` 复用的 tsup 基础配置，负责根 bundle、external、banner、CSS loader 和 Tailwind CSS 处理。
- `@website/infra/tailwind.config.cjs`：workspace 共享 Tailwind 配置。仓库根目录的 `tailwind.config.js` 只作为兼容自动发现的薄入口。
- `website-package-modules`：在 tsup 根 bundle 之后生成 `dist/es`、`dist/lib`、声明文件、CSS 拷贝和样式入口。bin 入口是 `bin/packageModules.cjs`，通过 `tsx` 加载 `src/packageModules.ts`。

包内的 `tsup.config.ts` 只保留该包自己的构建声明，例如输出格式、`packageBuild.styleDependencies` 和组件级样式依赖。
