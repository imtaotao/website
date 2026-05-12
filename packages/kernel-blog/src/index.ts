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
export { Renderer as BlogMdx, extractHeadings } from '@website-kernel/markdown';
export {
  BlogThemeToggle,
  useBlogTheme,
} from '#blog/components/BlogThemeToggle/BlogThemeToggle';
export {
  BLOG_TAG_QUERY_KEY,
  BlogHomePage,
  createBlogTagNavigation,
  formatBlogDate,
} from '#blog/pages/BlogHomePage/HomePage';
export { BlogArticlePage } from '#blog/pages/BlogArticlePage/ArticlePage';
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
export type { BlogTheme } from '#blog/components/BlogThemeToggle/BlogThemeToggle';
export type {
  BlogHomeArticle,
  BlogHomePageProps,
} from '#blog/pages/BlogHomePage/HomePage';
export type {
  BlogArticlePageProps,
  BlogArticleView,
} from '#blog/pages/BlogArticlePage/ArticlePage';
export type { Heading } from '@website-kernel/markdown';

const ARTICLE_ENTRY_FILENAME = 'index.mdx';

const compareDateDesc = (left: string, right: string) => {
  return Date.parse(right) - Date.parse(left);
};

const sortBlogArticles = (items: Array<BlogArticleDetail>) => {
  return items.sort((left, right) => {
    const byPublishedAt = compareDateDesc(left.publishedAt, right.publishedAt);
    if (byPublishedAt !== 0) return byPublishedAt;

    return left.title.localeCompare(right.title);
  });
};

const resolveTagMap = (options?: BlogContentOptions) => {
  return options?.tagMap ?? blogTagMap;
};

const resolveArticleSourceModules = (options?: BlogContentOptions) => {
  const modules = options?.articleSourceModules;
  if (!modules) {
    throw new Error(
      'Missing "articleSourceModules". In browser/Vite environment, ' +
        'pass the result of import.meta.glob(".../index.mdx", { query: "?raw", eager: true }).',
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

const isVisibleArticle = (
  article: BlogArticleDetail,
  options?: BlogContentOptions,
) => {
  return !article.hidden || Boolean(options?.includeHidden);
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
}: BlogArticleDetail) => {
  return article;
};

const createBlogContent = (options?: BlogContentOptions) => {
  const tagMap = resolveTagMap(options);
  const modules = resolveArticleSourceModules(options);

  const entries = Object.entries(modules).filter(([sourcePath]) =>
    sourcePath.replace(/\\/g, '/').endsWith(`/${ARTICLE_ENTRY_FILENAME}`),
  );

  const articleBySlug = new Map<string, BlogArticleDetail>();

  const allArticles = sortBlogArticles(
    entries.map(([sourcePath, source]) => {
      const article = readArticleFromModule(sourcePath, source);

      if (articleBySlug.has(article.slug)) {
        throw new Error(
          `Duplicate slug "${article.slug}" found in ${article.sourcePath}.`,
        );
      }

      assertKnownTags(article, tagMap, article.sourcePath);
      articleBySlug.set(article.slug, article);

      return article;
    }),
  );
  const articles = allArticles.filter((article) =>
    isVisibleArticle(article, options),
  );
  const tagCounts = new Map<string, number>();

  for (const article of articles) {
    for (const tag of article.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    articles,
    articleBySlug,
    tags: createBlogTagSummaries(tagMap, tagCounts),
  };
};

export function getAllArticles(options?: BlogContentOptions) {
  return createBlogContent(options).articles.map(stripArticleContent);
}

export function getArticleBySlug(slug: string, options?: BlogContentOptions) {
  const article = createBlogContent({
    ...options,
    includeHidden: true,
  }).articleBySlug.get(slug);
  if (!article) return undefined;
  return isVisibleArticle(article, options) ? article : undefined;
}

export function getAllTags(options?: BlogContentOptions) {
  return createBlogContent(options).tags;
}

export function getArticlesByTag(tag: string, options?: BlogContentOptions) {
  return createBlogContent(options)
    .articles.filter((article) => article.tags.includes(tag))
    .map(stripArticleContent);
}

export function getTagByKey(tag: string, options?: BlogContentOptions) {
  return createBlogContent(options).tags.find((item) => item.key === tag);
}
