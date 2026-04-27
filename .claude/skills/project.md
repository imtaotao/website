---
name: project
description: 仓库项目速览与常用命令
version: 0.1.0
---

# Website 项目说明（Skill）

本文件用于快速描述仓库 `imtaotao/website` 的模块划分、主要功能，以及在本地开发/构建/部署时常用的命令。

## 项目概览

- 类型：个人网站前端（静态站点），部署到 GitHub Pages
- 线上地址：`https://imtaotao.me`
- 技术栈：React 18 + Vite 8 + TypeScript
- 路由方案：`react-router`（后续落地到代码与依赖）
- 路由约定：根路径 `/` 用于简历展示（Resume）。
- 包管理/工作区：pnpm workspace（monorepo）
- 环境要求：Node `>= 22`，pnpm `10.27.0`

## 模块与目录结构

- `app/`：站点前端应用（Vite + React）
  - 入口：`app/src/main.tsx`
  - 页面/组件：`app/src/App.tsx`
  - 样式：`app/src/index.css`、`app/src/App.css`
  - 静态资源：`app/src/assets/`、`app/src/public/`
- `packages/kernel-shared/`：共享内核包（可复用的 TS 工具/能力，供 `app` 依赖）
  - 入口：`packages/kernel-shared/src/index.ts`
  - 单测：`packages/kernel-shared/src/__tests__/`
  - 构建：`tsup`（见 `packages/kernel-shared/tsup.config.ts`）
- `.github/workflows/deploy.yml`：CI/CD（构建并发布到 GitHub Pages）
- `.claude/skills/`：Trae/Claude skills 目录（本文件提供“项目速览”上下文）

## 功能介绍

- 站点内容：当前为简单主页文案，包含个人介绍与 GitHub 链接
- 自动化部署：推送到 `master` 触发 GitHub Actions
  - 先构建 `packages`（确保共享包产物可用）
  - 再构建 `app` 产物到 `app/dist`
  - 自动生成 `CNAME` 及微信校验文件后发布到 `gh-pages`

## 工程约定

- TypeScript 路径别名（见 `tsconfig.json`）
  - `#app/*` -> `app/src/*`
  - `#shared/*` -> `packages/kernel-shared/src/*`
  - `@website-kernel/*` -> `packages/kernel-*/src`
- CSS 方案：`Tailwind CSS`（约定作为全站主要样式方式；落地到配置与依赖后以其为准）。
- 代码风格：Prettier（根目录 `pnpm format`）
- Git hooks：Husky + lint-staged（提交时对变更文件做格式化）
- icon 图标：`@radix-ui/react-icons`（如缺少特定平台图标，则补充到 `app/src/assets/image/`）

## 常用命令与用途

在仓库根目录执行：

- `pnpm install`：安装所有 workspace 依赖
- `pnpm dev`：启动站点开发服务器（等价于 `pnpm --filter @website/app run dev`）
- `pnpm build`：构建站点（等价于 `pnpm --filter @website/app run build`，产物在 `app/dist`）
- `pnpm preview`：本地预览构建产物（等价于 `pnpm --filter @website/app run preview`）
- `pnpm dev:packages`：并行监听构建所有 `@website-kernel/*` 包（共享包联调用）
- `pnpm build:packages`：并行构建所有 `@website-kernel/*` 包（CI 中会先跑它）
- `pnpm format`：格式化 `app/` 与 `packages/` 下的 `js/ts/tsx` 代码
- `pnpm format:md`：格式化 `claude/` 下的 `md/mdx` 文件

在单个包内或使用 `--filter`：

- `pnpm --filter @website/app run lint`：运行前端 eslint
- `pnpm --filter @website-kernel/shared run test`：运行共享包单测（vitest）
- `pnpm --filter @website-kernel/shared run test:coverage`：运行共享包单测并生成覆盖率
- `pnpm --filter @website-kernel/shared run typecheck`：共享包类型检查（tsc）

## 常见改动入口

- 修改主页内容：`app/src/App.tsx`
- 调整全局样式/字体：`app/src/index.css`、`app/src/assets/fonts/`
- 新增/修改共享工具：`packages/kernel-shared/src/index.ts`
