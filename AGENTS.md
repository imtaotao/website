# Website 项目说明

这个仓库是 `imtaotao.me` 网站使用的 pnpm workspace。

## 项目概览

- 前端应用：`app/`
- 共享包：`packages/kernel-shared/`
- 部署目标：GitHub Pages
- 运行环境：Node `>=22`，pnpm `10.27.0`

## 工作约定

- 优先做最小改动，不要顺手格式化或重命名无关代码。
- 新增实现前，先遵循现有目录结构和项目模式。
- 可复用工具优先放到 `packages/kernel-shared/`，不要散落在 `app/` 内。
- 合适时优先使用 `tsconfig.json` 里已有的 TypeScript 路径别名。
- 简历相关实现，以 `docs/codex/` 下文档为准。

## 常用命令

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm dev:packages`
- `pnpm build:packages`
- `pnpm format`
- `pnpm format:md`

## 常见修改入口

- 应用入口：`app/src/main.tsx`
- 主页面组件：`app/src/App.tsx`
- 全局样式：`app/src/index.css`
- 应用样式：`app/src/App.css`
- 共享包入口：`packages/kernel-shared/src/index.ts`

## 项目文档

- 简历功能说明：`docs/codex/resume-function.md`
- 简历界面说明：`docs/codex/resume-ui.md`
- 本地代码风格：`docs/codex/style.md`

## commit 提交格式

commit 使用英文提交。

```shell
<type>(<scope>): <subject>
// 注意冒号 : 后有空格
// 如 feat(resume): 增加了简历导出相关功能
```

scope 选填表示 commit 的作用范围，如数据层、视图层，也可以是目录名称 subject 必填用于对 commit 进行简短的描述 type 必填表示提交类型，值有以下几种：

```shell
eat - 新功能 feature
fix - 修复 bug
docs - 文档注释
style - 代码格式(不影响代码运行的变动)
refactor - 重构、优化(既不增加新功能，也不是修复bug)
perf - 性能优化
test - 增加测试
chore - 构建过程或辅助工具的变动
revert - 回退
build - 打包
```

## 迁移说明

原来的 `.claude/skills/` 目录暂时保留，用于兼容现有流程。面向 Codex 的项目说明现在统一放在本文件和 `docs/codex/` 目录下。
