import {
  blogTagMap,
  extractFrontmatter,
  type BlogArticleFrontmatter,
  type BlogTagSummary,
} from '@website-kernel/blog/browser';

type RawArticleModule = Record<string, string>;
type RawAssetModule = Record<string, string>;

export type BlogArticleView = BlogArticleFrontmatter & {
  content: string;
  coverUrl?: string;
  tagLabels: Array<string>;
};

const articleSourceModules = import.meta.glob('../content/blog/*/index.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as RawArticleModule;

const articleAssetModules = import.meta.glob(
  '../content/blog/*/image/*.{png,jpg,jpeg,webp,avif,svg}',
  {
    eager: true,
    import: 'default',
  },
) as RawAssetModule;

const compareDateDesc = (left: string, right: string) => {
  return Date.parse(right) - Date.parse(left);
};

const toArticleAssetKey = (articlePath: string, assetPath: string) => {
  const normalizedArticlePath = articlePath.replace(/\\/g, '/');
  const normalizedAssetPath = assetPath.replace(/\\/g, '/');
  const articleDir = normalizedArticlePath.slice(
    0,
    normalizedArticlePath.lastIndexOf('/'),
  );

  if (normalizedAssetPath.startsWith('./')) {
    return `${articleDir}/${normalizedAssetPath.slice(2)}`;
  }

  return `${articleDir}/${normalizedAssetPath}`;
};

const buildBlogArticles = () => {
  return Object.entries(articleSourceModules)
    .map(([sourcePath, source]) => {
      const { frontmatter, content } = extractFrontmatter(source, sourcePath);
      const coverUrl = frontmatter.cover
        ? articleAssetModules[toArticleAssetKey(sourcePath, frontmatter.cover)]
        : undefined;

      return {
        ...frontmatter,
        content,
        coverUrl,
        tagLabels: frontmatter.tags.map((tag) => blogTagMap[tag]?.label ?? tag),
      };
    })
    .sort((left, right) => {
      const byPublishedAt = compareDateDesc(
        left.publishedAt,
        right.publishedAt,
      );
      if (byPublishedAt !== 0) return byPublishedAt;

      const byUpdatedAt = compareDateDesc(left.updatedAt, right.updatedAt);
      if (byUpdatedAt !== 0) return byUpdatedAt;

      return left.title.localeCompare(right.title);
    });
};

const BLOG_ARTICLES = buildBlogArticles();

export const getBlogArticles = (): Array<BlogArticleView> => BLOG_ARTICLES;

export const getBlogArticleBySlug = (slug: string) => {
  return BLOG_ARTICLES.find((article) => article.slug === slug);
};

export const getBlogTagSummaries = (): Array<BlogTagSummary> => {
  return Object.entries(blogTagMap)
    .map(([key, tag]) => ({
      key,
      ...tag,
      count: BLOG_ARTICLES.filter((article) => article.tags.includes(key))
        .length,
    }))
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.label.localeCompare(right.label);
    });
};

export const getBlogTagByKey = (tag: string) => {
  return getBlogTagSummaries().find((item) => item.key === tag);
};

export const getBlogArticlesByTag = (tag: string) => {
  return BLOG_ARTICLES.filter((article) => article.tags.includes(tag));
};
