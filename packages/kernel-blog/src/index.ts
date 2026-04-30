import { blogTagMap } from '#blog/tags';
import { createBlogTagSummaries } from '#blog/tagHelpers';
import {
  extractFrontmatter,
  normalizeBlogArticleFrontmatter,
} from '#blog/articleSchema';
import type {
  BlogTagMap,
  BlogArticleDetail,
  BlogArticleMeta,
  BlogContentOptions,
} from '#blog/articleTypes';

export { blogTagMap };
export { extractFrontmatter, normalizeBlogArticleFrontmatter };
export type {
  BlogArticleDetail,
  BlogArticleFrontmatter,
  BlogArticleMeta,
  BlogContentOptions,
  BlogTagKey,
  BlogTagMap,
  BlogTagMeta,
  BlogTagSummary,
} from '#blog/articleTypes';

const ARTICLE_ENTRY_FILENAME = 'index.mdx';

const compareDateDesc = (left: string, right: string) => {
  return Date.parse(right) - Date.parse(left);
};

const sortBlogArticles = (items: Array<BlogArticleDetail>) => {
  return items.sort((left, right) => {
    const byPublishedAt = compareDateDesc(left.publishedAt, right.publishedAt);
    if (byPublishedAt !== 0) return byPublishedAt;

    const byUpdatedAt = compareDateDesc(left.updatedAt, right.updatedAt);
    if (byUpdatedAt !== 0) return byUpdatedAt;

    return left.title.localeCompare(right.title);
  });
};

const resolveTagMap = (options?: BlogContentOptions): BlogTagMap => {
  return options?.tagMap ?? blogTagMap;
};

const resolveArticleSourceModules = (options?: BlogContentOptions) => {
  const modules = options?.articleSourceModules;
  if (!modules) {
    throw new Error(
      'Missing "articleSourceModules". In browser/Vite environment, pass the result of import.meta.glob(".../index.mdx", { query: "?raw", eager: true }).',
    );
  }
  return modules;
};

const assertKnownTags = (
  article: BlogArticleMeta,
  tagMap: BlogTagMap,
  sourcePath: string,
) => {
  for (const tag of article.tags) {
    if (!tagMap[tag]) {
      throw new Error(`Unknown tag "${tag}" found in ${sourcePath}.`);
    }
  }
};

const getArticleDirFromSourcePath = (sourcePath: string) => {
  const normalized = sourcePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) {
    return '.';
  }
  return normalized.slice(0, lastSlash);
};

const readArticleFromModule = (sourcePath: string, source: string) => {
  const { frontmatter, content } = extractFrontmatter(source, sourcePath);
  const articleDir = getArticleDirFromSourcePath(sourcePath);

  return {
    ...frontmatter,
    articleDir,
    sourcePath,
    content,
  } satisfies BlogArticleDetail;
};

const stripArticleContent = ({
  content: _content,
  ...article
}: BlogArticleDetail): BlogArticleMeta => {
  return article;
};

const createBlogContent = (options?: BlogContentOptions) => {
  const tagMap = resolveTagMap(options);
  const modules = resolveArticleSourceModules(options);

  const entries = Object.entries(modules).filter(([sourcePath]) =>
    sourcePath.replace(/\\/g, '/').endsWith(`/${ARTICLE_ENTRY_FILENAME}`),
  );

  const articleBySlug = new Map<string, BlogArticleDetail>();
  const tagCounts = new Map<string, number>();

  const articles = sortBlogArticles(
    entries.map(([sourcePath, source]) => {
      const article = readArticleFromModule(sourcePath, source);

      if (articleBySlug.has(article.slug)) {
        throw new Error(
          `Duplicate slug "${article.slug}" found in ${article.sourcePath}.`,
        );
      }

      assertKnownTags(article, tagMap, article.sourcePath);
      articleBySlug.set(article.slug, article);

      for (const tag of article.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }

      return article;
    }),
  );

  return {
    articles,
    articleBySlug,
    tags: createBlogTagSummaries(tagMap, tagCounts),
  };
};

export const getAllArticles = (options?: BlogContentOptions) => {
  return createBlogContent(options).articles.map(stripArticleContent);
};

export const getArticleBySlug = (
  slug: string,
  options?: BlogContentOptions,
) => {
  return createBlogContent(options).articleBySlug.get(slug);
};

export const getAllTags = (options?: BlogContentOptions) => {
  return createBlogContent(options).tags;
};

export const getArticlesByTag = (tag: string, options?: BlogContentOptions) => {
  return createBlogContent(options)
    .articles.filter((article) => article.tags.includes(tag))
    .map(stripArticleContent);
};

export const getTagByKey = (tag: string, options?: BlogContentOptions) => {
  return createBlogContent(options).tags.find((item) => item.key === tag);
};
