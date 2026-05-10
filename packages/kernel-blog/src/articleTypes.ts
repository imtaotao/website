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
  summary?: string;
  cover?: string;
  coverPosition?: string;
  externalUrl?: string;
  bgm?: boolean;
  hidden?: boolean;
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
  includeHidden?: boolean;
  /**
   * Browser/Vite environment data loaded with import.meta.glob.
   * key: sourcePath
   * value: file content string, usually imported with ?raw
   */
  articleSourceModules?: Record<string, string>;
};
