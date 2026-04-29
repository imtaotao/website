# 博客模块实现方案草案

这个文档基于 `docs/codex/blog-discussion.md` 中已经确认的讨论结论整理，用于指导博客模块第一版实现。

## 目标

- 在现有网站中新增博客能力。
- 第一版优先完成最小可用闭环，不引入数据库和复杂交互。
- 内容以本地 `MDX` 文件维护，并通过静态站方式展示。

## 第一版范围

- 博客列表页
- 博客详情页
- 标签总览页
- 标签详情页
- 本地文章内容扫描与元数据读取
- 标签聚合
- 文章头图展示
- 数学公式、代码高亮、图片渲染

以下内容不纳入第一版必做范围：

- 评论
- 订阅
- RSS
- sitemap
- SEO 深度优化
- 复杂互动能力

## 路由结构

第一版采用以下固定路由：

- `/blog`
- `/blog/:slug`
- `/blog/tags`
- `/blog/tags/:tag`

约束如下：

- `slug` 来自文章 frontmatter，手写维护。
- `tag` 来自文章 frontmatter 中的稳定值。
- 标签使用独立页面，不通过查询参数承担主导航职责。

## 内容组织

博客内容放在 `packages/kernel-blog/` 中维护。

建议目录草案：

```text
packages/kernel-blog/
  articles/
    react-render-notes/
      index.mdx
      cover.jpg
      demo.png
    my-first-post/
      index.mdx
      cover.jpg
  src/
    index.ts
    tags.ts
    content/
      load-articles.ts
      article-schema.ts
      article-types.ts
      tag-helpers.ts
```

目录约定：

- `articles/` 下采用扁平的文章单元目录结构。
- 每篇文章有自己的独立目录。
- 文章正文统一放在 `index.mdx`。
- `cover` 和正文内使用的本地图片与文章放在同一目录。
- 目录本身不表达分类含义，分类和聚合依赖 `tags`。

## Frontmatter 约定

第一版最小字段：

- `title`
- `slug`
- `tags`
- `publishedAt`
- `updatedAt`
- `summary`
- `cover`

字段说明：

- `title`: 文章标题。
- `slug`: 文章唯一标识，用于详情页路由，手写维护。
- `tags`: 标签稳定值数组，例如 `["react", "typescript"]`。
- `publishedAt`: 发布时间，静态维护。
- `updatedAt`: 更新时间，静态维护。
- `summary`: 列表页和分享场景使用的简短摘要。
- `cover`: 头图资源路径，首版可选，但页面设计默认优先按有图文章处理。

frontmatter 示例：

```yaml
title: React 渲染笔记
slug: react-render-notes
tags:
  - react
  - typescript
publishedAt: 2026-04-29
updatedAt: 2026-04-29
summary: 一篇关于 React 渲染过程与实现细节的记录。
cover: ./cover.jpg
```

## 标签配置

标签展示信息在 `packages/kernel-blog/` 中集中维护，不散落在文章文件内。

建议数据结构：

```ts
export const blogTagMap = {
  react: {
    label: 'React',
    description: 'React related posts',
    order: 10,
  },
  typescript: {
    label: 'TypeScript',
    description: 'TypeScript notes and practice',
    order: 20,
  },
} as const;
```

第一版最小字段：

- `label`
- `description`
- `order`

设计约束：

- `tags` 只存稳定值。
- 标签页展示名称来自集中配置。
- 标签排序、标签描述、标签页头部说明统一依赖这份配置。

## `kernel-blog` 职责建议

第一版建议把博客内容层的通用逻辑收敛到 `packages/kernel-blog/`：

- 扫描 `articles/` 目录
- 读取并解析 `MDX` 文件与 frontmatter
- 校验 frontmatter 必填字段
- 校验文章中引用的标签是否存在于标签映射中
- 生成文章列表数据
- 生成按 `slug` 索引的数据
- 生成按标签聚合的数据

第一版不建议在 `kernel-blog` 中承担：

- 页面 UI
- 路由定义
- 页面级视觉布局

也就是说，`kernel-blog` 负责内容和数据准备，`app/` 负责页面消费和展示。

## 建议导出 API

为了让 `app/` 的消费层足够简单，第一版可以优先准备以下能力：

- `getAllArticles()`
- `getArticleBySlug(slug)`
- `getAllTags()`
- `getArticlesByTag(tag)`
- `getTagByKey(tag)`

可选地补一层类型导出：

- `BlogArticleMeta`
- `BlogArticleDetail`
- `BlogTagKey`
- `BlogTagMeta`

## 页面职责建议

### `/blog`

- 展示博客首页
- 提供标签入口
- 展示文章列表
- 文章按时间倒序排列

### `/blog/:slug`

- 展示文章正文
- 展示标题、时间、标签、摘要、头图
- 渲染公式、代码块、图片

### `/blog/tags`

- 展示所有标签
- 展示每个标签的名称、描述、文章数量

### `/blog/tags/:tag`

- 展示单个标签的信息
- 展示该标签下的文章列表

## 资源处理建议

第一版建议使用相对简单的资源组织策略：

- `cover` 指向文章目录内的本地文件
- 正文图片也优先使用文章目录内本地资源
- 不额外建立全局博客图片目录

当前仍可留待实现时细化的点：

- `cover` 文件名是否统一推荐为 `cover.*`
- `MDX` 中本地资源最终如何被构建工具解析

## 校验建议

第一版建议至少做以下校验：

- `slug` 不为空
- `slug` 全局唯一
- `tags` 中的每个值都存在于标签映射
- `publishedAt`、`updatedAt` 可被解析为合法日期
- `summary` 不为空
- `title` 不为空

如果校验失败，优先在构建阶段直接报错，而不是在运行时兜底。

## 当前暂缓决策

以下内容不阻塞第一版实现，可以在实现中保留扩展空间：

- `/blog` 首页是否带单独的主视觉卡片
- 列表页信息密度
- 详情页是否首版支持目录
- 详情页是否首版支持上一篇/下一篇
- 是否增加阅读时长
- 更细的 SEO 结构

## 实施顺序建议

建议按以下顺序推进：

1. 在 `kernel-blog` 中建立文章目录约定、标签配置和类型定义。
2. 完成文章扫描、frontmatter 解析、标签聚合和基础校验。
3. 在 `app/` 中接入博客路由。
4. 完成 `/blog`、`/blog/:slug`、`/blog/tags`、`/blog/tags/:tag` 四类页面。
5. 补齐公式、代码高亮、图片渲染。
6. 再根据页面效果决定列表页密度和详情页增强能力。

## 与讨论文档的关系

- 需求和结论以 `docs/codex/blog-discussion.md` 为准。
- 本文档用于承接实现层设计。
- 后续如果实现中有新增决策，应优先回写到讨论文档或补充到本文档。
