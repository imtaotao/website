import {
  blogTagMap,
  normalizeBlogArticleFrontmatter,
  type BlogTagSummary,
  type BlogArticleFrontmatter,
} from '@website-kernel/blog';

import type { ComponentType } from 'react';

type MdxArticleModule = Record<
  string,
  {
    default: ComponentType<Record<string, unknown>>;
    frontmatter?: unknown;
  }
>;
type RawAssetModule = Record<string, string>;

export type BlogArticleView = BlogArticleFrontmatter & {
  Content: ComponentType<Record<string, unknown>>;
  coverUrl?: string;
  tagLabels: Array<string>;
};

// @ts-ignore
const articleSourceModules = import.meta.glob('../blog/*/index.mdx', {
  eager: true,
}) as MdxArticleModule;

// @ts-ignore
const articleAssetModules = import.meta.glob(
  '../blog/*/image/*.{png,jpg,jpeg,webp,avif,svg}',
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
    .map(([sourcePath, module]) => {
      const frontmatter = normalizeBlogArticleFrontmatter(
        module.frontmatter,
        sourcePath,
      );
      const coverUrl = frontmatter.cover
        ? articleAssetModules[toArticleAssetKey(sourcePath, frontmatter.cover)]
        : undefined;

      return {
        ...frontmatter,
        Content: module.default,
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

export const formatBlogDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

export const formatBlogMeta = (tags: Array<string>) => {
  if (tags.length === 0) {
    return '未分类';
  }
  return tags.join(' / ');
};
