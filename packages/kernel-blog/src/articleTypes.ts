export type BlogTagMeta = {
  label: string;
  description: string;
  order: number;
};

export type BlogTagMap = Record<string, BlogTagMeta>;

export type BlogTagSummary = BlogTagMeta & {
  key: string;
  count: number;
};

export type BlogTagKey = string;

export type BlogArticleFrontmatter = {
  title: string;
  slug: string;
  tags: Array<BlogTagKey>;
  publishedAt: string;
  updatedAt: string;
  summary: string;
  cover?: string;
};

export type BlogArticleMeta = BlogArticleFrontmatter & {
  articleDir: string;
  sourcePath: string;
};

export type BlogArticleDetail = BlogArticleMeta & {
  content: string;
};

export type BlogContentOptions = {
  articlesDir?: string;
  tagMap?: BlogTagMap;
  /**
   * Browser/Vite 场景下通过 import.meta.glob 注入的文章源文件内容。
   * key: sourcePath（glob 返回的模块 key）
   * value: 源文件字符串（通常来自 ?raw）
   */
  articleSourceModules?: Record<string, string>;
};
