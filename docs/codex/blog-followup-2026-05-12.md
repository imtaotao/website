# 博客组件跟进记录（2026-05-12）

这份文档用于承接今天博客正文组件这一轮迭代，方便下一次继续时快速恢复上下文。

## 本轮主要改动

### 博客页面与正文样式

- `packages/kernel-blog/src/pages/BlogPage.css` 已按页面职责和组件职责拆分过一轮。
- `BlogHomePage/index.css` / `BlogArticlePage/index.css` / `BlogArticleActions.css` / `BlogShared.css` 已分离。
- 博客首页 PC 端标题、标签、时间字号做过调整。
- 博客首页外部链接文章标题增加了更淡的下划线提示。
- Markdown 正文标题颜色已做分级区分，暗色主题下也补了一套更明显的层级颜色。

### Markdown 媒体组件

原先通用的 `MediaEmbed` / `MediaLink` 已拆散，当前按职责分成独立文件：

- `MarkdownAudioEmbed.tsx`
- `MarkdownVideoEmbed.tsx`
- `MarkdownAudioLink.tsx`
- `MarkdownVideoLink.tsx`
- `MarkdownImage.tsx`
- `MarkdownImageGallery.tsx`

对应 CSS 也已经拆开：

- `MarkdownAudioEmbed.css`
- `MarkdownVideoEmbed.css`
- `MarkdownAudioLink.css`
- `MarkdownVideoLink.css`
- `MarkdownImage.css`

当前约定：

- `AudioEmbed` / `VideoEmbed`
  - 有 `src` 时展示内置播放器。
  - 无 `src` 时保持外链卡片语义。
- `AudioLink`
  - `src` 可选，有 `src` 时允许直接播放。
  - `href` 可选，没有 `href` 时不展示外链入口。
- `VideoLink`
  - 保持独立实现，不再和音频逻辑耦合。

### 音频播放器

- `AudioEmbed` 已改为自定义播放器 UI，不再使用原生 `controls`。
- 当前支持：
  - 播放 / 暂停
  - 可拖动进度条
  - `当前时间 / 总时长`
  - `loading` / `audio unavailable` 状态
- `AudioLink` 也补齐了相近的播放状态逻辑。

仍需注意：

- 自定义 `range` 在不同浏览器上的 thumb 对齐可能还有细微差异。
- 这块后续如果继续微调，优先只做视觉校准，不要再改大结构。

## 新增的 Markdown 组件

### GitHub 行内组件

已新增：

- `GitHubMention`
- `GitHubRepo`
- `UrlLink`

当前特性：

- `GitHubMention` 适合正文内行内插入，展示头像与名字。
- `GitHubRepo` 适合正文内展示仓库入口。
- 二者都有 hover card。
- hover card 当前是：
  - 移入触发器时立即显示
  - 从按钮离开时 `300ms` 后关闭
  - 从卡片本体离开时立即关闭
- 卡片显隐已改成常驻 DOM + CSS 动画，不再是条件卸载。

### FancyList

已新增 `FancyList`：

- 支持整体 `title`
- `items` 支持纯文本、`ReactNode`、或带 `title/content` 的对象
- 每一项内容允许直接写 MDX 节点

当前限制：

- 如果传的是普通字符串，里面的 markdown 语法不会二次解析。
- 要让内联 `code`、组件、强调等生效，应该直接传 JSX / MDX 节点。

demo 里：

- “后续约定”已恢复为原始 MDX 列表。
- `FancyList` 单独有自己的示例章节。

### WebEmbed

- `WebEmbed` 已存在。
- 目前仍是纯 `iframe` 版本，没有额外 fallback UI。

已确认的限制：

- 很多站点会因为 `X-Frame-Options` 或 `CSP frame-ancestors` 拒绝被嵌入。
- 这不是前端多传几个 `iframe` 属性就能解决的问题。

### XPostEmbed

- 当前 `XPostEmbed` 使用官方 widget 方案，基于 `react-twitter-widgets`。
- 当前方向是保留官方帖子本体，不再尝试做我们自己的帖子卡片 UI。
- 组件已有加载中与加载失败状态。

当前已知情况：

- 高度优先交给官方 widget 自适应，避免 `iframe` 固定高度带来的滚动条问题。
- 宽度和居中只能做有限控制，最终仍会受官方生成结构影响。
- 暗色主题下的圆角边缘和背景偶发露白，不一定是我们外层 CSS 能完全接管的，很多时候是内层 `iframe` / 官方渲染层造成的。

当前共识：

- 这块不要继续做太重的样式覆盖。
- 如果后续继续调，优先只动：
  - 外层宽度
  - 居中
  - 必要的圆角裁切
  - loading / error UI

## demo 文章

`blog/demo/index.mdx` 目前主要承担这些示例：

- 图片
- 图片网格
- 音频 / 视频 embed
- 音频 / 视频 link
- GitHubMention / GitHubRepo / UrlLink
- WebEmbed
- XPostEmbed
- FancyList

后续如果继续加组件，优先放到这篇里验证交互与视觉。

## 明天继续时建议先看

优先阅读这些文件：

- `packages/kernel-blog/src/components/Markdown.tsx`
- `packages/kernel-blog/src/components/MarkdownTypes.ts`
- `packages/kernel-blog/src/components/Markdown.css`
- `packages/kernel-blog/src/components/MarkdownXPostEmbed.tsx`
- `packages/kernel-blog/src/components/MarkdownXPostEmbed.css`
- `blog/demo/index.mdx`

## 明天可继续的方向

### 1. 收尾 XPostEmbed

目标不是再大改，而是做一轮最小收口：

- 清理残留或无效的覆盖样式
- 只保留确实在 dev-server 上能观察到效果的规则
- 确认暗色 / 亮色两套下的最终表现

### 2. 继续补正文组件

今天讨论过，后面如果继续扩展，优先级较高的是：

- `Steps`

## 后续可补的组件清单

这一段单独列出来，主要是防止后面忘记我们已经讨论过哪些方向。

### 优先级更高

- `Steps`
  - 适合教程、排障流程、分步骤说明。
  - 比普通有序列表更稳定，也更容易做统一样式。

### 可以后补

- `Comparison`
  - 用于两列或三列对比，比如方案 A / B、优缺点对照。
- `Table` 壳层增强
  - 如果后面原生 markdown 表格不够用，可以加一个更统一的表格容器或样式增强。
- `References`
  - 专门用于文章末尾的引用、资料来源、延伸阅读。
- `BadgeGroup`
  - 用于展示技术栈、状态、标签集合。
- `VideoTimestampList`
  - 如果后面会写视频笔记、播客摘要，这个会比较合适。

### 3. 标题层级颜色

如果明天还觉得暗色主题标题层级不明显，优先检查：

- `.blog-shell[data-blog-theme='dark']` 是否稳定存在
- 标题节点是否都带了 `blog-prose-h1 ~ h6`
- 是否有后续样式覆盖了 `Markdown.css` 中的深色规则

## 备注

- 这轮主要是视觉微调，用户本地一直开着 `dev-server`。
- 类似样式改动后，默认不要跑 `pnpm build`，除非用户明确要求或需要最终验证。
