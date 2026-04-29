import fs from 'node:fs';
import path from 'node:path';

import type {
  BlogArticleDetail,
  BlogArticleMeta,
  BlogContentOptions,
  BlogTagMap,
} from '#article-types';
import { blogTagMap } from '#tags';
import { extractFrontmatter } from '#content/article-schema';
import { createBlogTagSummaries } from '#content/tag-helpers';

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

const findWorkspaceRoot = (startDir: string) => {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
};

export const getDefaultBlogArticlesDir = () => {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  return path.join(workspaceRoot, 'packages', 'kernel-blog', 'articles');
};

const resolveArticlesDir = (options?: BlogContentOptions) => {
  return options?.articlesDir ?? getDefaultBlogArticlesDir();
};

const resolveTagMap = (options?: BlogContentOptions): BlogTagMap => {
  return options?.tagMap ?? blogTagMap;
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

const readArticleDirectories = (articlesDir: string) => {
  if (!fs.existsSync(articlesDir)) {
    return [];
  }

  return fs
    .readdirSync(articlesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(articlesDir, entry.name))
    .filter((entryDir) =>
      fs.existsSync(path.join(entryDir, ARTICLE_ENTRY_FILENAME)),
    )
    .sort((left, right) => left.localeCompare(right));
};

const readArticle = (articleDir: string): BlogArticleDetail => {
  const sourcePath = path.join(articleDir, ARTICLE_ENTRY_FILENAME);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const { frontmatter, content } = extractFrontmatter(source, sourcePath);

  return {
    ...frontmatter,
    articleDir,
    sourcePath,
    content,
  };
};

const stripArticleContent = ({
  content: _content,
  ...article
}: BlogArticleDetail): BlogArticleMeta => {
  return article;
};

const createBlogContent = (options?: BlogContentOptions) => {
  const articlesDir = resolveArticlesDir(options);
  const tagMap = resolveTagMap(options);
  const articleDirs = readArticleDirectories(articlesDir);
  const articleBySlug = new Map<string, BlogArticleDetail>();
  const tagCounts = new Map<string, number>();
  const articles = sortBlogArticles(
    articleDirs.map((articleDir) => {
      const article = readArticle(articleDir);

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
