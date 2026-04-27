---
name: resume
description: 简历模块（Resume）的讨论结论与实现约定
version: 0.1.0
---

# 简历模块（Skill）

本文件用于沉淀“简历（Resume）模块”的讨论结论，作为后续在本仓库实现/迭代简历页面与数据结构的单一参考。

## 结论摘要（TL;DR）

- 展示范围：仅包含我的从业经历，以及每段经历中做过的事情/产出。
- 语言：仅中文（暂不做中英双语）。
- 能力：页面提供导出按钮，一键导出 `PDF` 或 `JPG`。
- 适配：不做响应式；提供两套渲染实现（桌面端/移动端），按设备尺寸选择渲染方式。
- 不做：不做登录、不做在线编辑。

## 目标与范围

- 目标：在个人站点展示从业经历与每段经历的具体工作内容，便于访问与分享，并支持一键导出 `PDF/JPG`。
- 范围边界：不做登录；不做在线编辑/管理后台；不做中英双语。

## 内容结构

- 区块范围：基本信息、简介、技能、开源项目、工作经历。
- 日期格式：统一使用 `YYYY-MM`（示例：`2023-04`）。
- 字段约定（建议）：
  - 基本信息：`name`、`title`、`location`（可选）、`phone`（可选）、`email`（可选）、`links[]`（可选，社交平台链接，含 `label`/`url`，例如 GitHub/知乎）。
  - 简介：`summary`（1-3 段短文或要点）。
  - 技能：`skills[]`（按类别分组：`category` + `items[]`；每个 item 包含 `name` + `level(1-100)`）。
  - 开源项目：`openSourceProjects[]`（每项包含 `name` + `description?` + `links?[]`；`links` 与 `basics.links` 同结构）。
  - 工作经历：`experiences[]`（按时间倒序），每段包含 `company`、`role`、`startAt`、`endAt`（在职可用 `present` 或空值）、`highlights[]`（每条为具体做过的事情/产出）。

## 展示与交互

- 页面形态：网页端展示 + 提供导出按钮，一键导出 `PDF/JPG`。
- 路由：根路径 `/` 为简历展示页。
- 适配策略：不做响应式；提供两套渲染实现（桌面端/移动端），根据设备尺寸判断并选择对应渲染方式。
- 交互与样式：分别保证桌面端与移动端可读性；补充打印/导出样式以确保 PDF 排版稳定。

## 数据来源与更新流程

- 数据来源：使用 YAML 作为事实源。
  - 推荐默认：一份总 YAML（建议路径：`app/src/content/resume.yaml`）。
  - 可选拆分：工作经历可按“每段经历一个独立 YAML 文件”拆分，便于维护与减少冲突。
- 渲染方式：由一个解析组件读取 YAML -> 生成统一的 `ResumeModel`（内存对象）-> 交给桌面端/移动端两套渲染组件。

### YAML 协议（v1）

- 根字段

  - `schemaVersion`: number（固定为 `1`）
  - `basics`: object（基本信息）
  - `summary`: string[]（简介要点，按顺序展示）
  - `skills`: { category: string; items: { name: string; level: number }[] }[]（技能分组；`level` 取值 `1-100`）
  - `openSourceProjects`: { name: string; description?: string; links?: { label: string; url: string }[] }[]（开源项目）
  - `experiences`: object[]（工作经历，按时间倒序；若不保证顺序则渲染侧排序）
  - `experienceIncludes?`: string[]（可选：拆分模式下，按顺序列出经历 YAML 的相对路径）

- `basics` 字段

  - `name`: string
  - `title`: string
  - `avatar?`: string（可选：头像图片 URL/路径）
  - `location?`: string
  - `phone?`: string
  - `email?`: string
  - `links?`: { label: string; url: string }[]（社交平台链接，例如 GitHub/知乎）

- `experiences[]` 字段
  - `company`: string
  - `department?`: string（可选：部门/团队，用于在公司内分组展示）
  - `role`: string
  - `startAt`: string（日期，格式 `YYYY-MM`）
  - `endAt`: string（日期，格式 `YYYY-MM`）| `present`（在职）
  - `businessHighlights?`: string[]（可选：业务侧要点，每条一句话）
  - `techHighlights?`: string[]（可选：技术侧要点，每条一句话）
  - `highlights`: string[]（其它要点/链接等；也兼容旧格式：在该数组里用 `业务侧：...` / `技术侧：...` 前缀区分）

### YAML 示例

```yaml
schemaVersion: 1
basics:
  name: 张三
  title: 前端工程师
  avatar: /assets/avatar.jpg
  location: 北京
  phone: 13800000000
  email: zhangsan@example.com
  links:
    - label: GitHub
      url: https://github.com/zhangsan
    - label: 知乎
      url: https://www.zhihu.com/people/zhangsan
summary:
  - 方向：Web 前端工程化与性能优化
  - 关注：可维护性与用户体验
skills:
  - category: 前端
    items:
      - name: React
        level: 85
      - name: TypeScript
        level: 80
      - name: Vite
        level: 70
  - category: 工程化
    items:
      - name: pnpm
        level: 70
      - name: ESLint
        level: 75
      - name: Prettier
        level: 75
openSourceProjects:
  - name: Garfish
    description: 微前端框架，聚焦运行时隔离与工程化能力。
    links:
      - label: GitHub
        url: https://github.com/modern-js-dev/garfish
experiences:
  - company: 字节跳动
    department: XXX 团队
    role: 前端工程师
    startAt: 2022-07
    endAt: present
    highlights:
      - 负责 XXX 页面重构，首屏耗时降低 30%
      - 搭建组件库与规范，提升协作效率
```

### 更新流程（建议）

- 修改：优先只改 YAML（单文件模式改 `resume.yaml`；拆分模式可新增/修改单段经历 YAML 并更新 `experienceIncludes`）。
- 预览：本地启动 `pnpm dev`，核对桌面端/移动端两套渲染。
- 导出：通过页面导出按钮一键导出 `PDF/JPG`（导出样式与技术选型在实现阶段细化）。

## 约束与注意事项

- 隐私：当前暂无不公开信息；后续如新增敏感字段，再补充脱敏/隐藏规则。
- SEO/可访问性：优先保证语义化结构（标题层级、列表）、文本可复制、移动端可读。
- 多语言：当前不需要中英双语；预留后续扩展空间。

## 后续实现细化（已定方向，细节待落地）

- 导出：页面上提供导出按钮，一键导出为 `PDF` 文件或 `JPG` 图片（实现细节后续落地到代码与依赖选型）。
- 多版本：当前不需要；保留扩展点，后续可按不同岗位生成不同版本（例如：前端/全栈/管理）。
- 数据：当前不需要从外部数据源同步，仅维护仓库内单一 YAML 数据源。
