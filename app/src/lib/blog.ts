import type { ComponentType } from 'react';
import { slash, uniq } from 'aidly';
import {
  blogTagMap,
  normalizeBlogArticleFrontmatter,
  type BlogTagSummary,
  type BlogArticleFrontmatter,
} from '@website-kernel/blog';

type RawAssetModule = Record<string, string>;

type MdxArticleModule = Record<
  string,
  {
    default: ComponentType<Record<string, unknown>>;
    frontmatter?: unknown;
  }
>;

export type BlogArticleView = BlogArticleFrontmatter & {
  Content: ComponentType<Record<string, unknown>>;
  coverUrl?: string;
  sourcePath: string;
  articleDir: string;
  tagLabels: Array<string>;
};

// @ts-ignore
const articleSourceModules = import.meta.glob('../../../blog/*/index.mdx', {
  eager: true,
}) as MdxArticleModule;

// @ts-ignore
const simpleSourceModules = import.meta.glob('../../../blog/*.mdx', {
  eager: true,
}) as MdxArticleModule;

// @ts-ignore
const articleImageAssetModules = import.meta.glob(
  '../../../blog/*/image/*.{png,jpg,jpeg,webp,avif,svg}',
  {
    eager: true,
    import: 'default',
  },
) as RawAssetModule;

// @ts-ignore
const articleCoverAssetModules = import.meta.glob(
  '../../../blog/*/cover.{png,svg,jpg,jpeg}',
  {
    eager: true,
    import: 'default',
  },
) as RawAssetModule;

// @ts-ignore
const articleRootMediaAssetModules = import.meta.glob(
  '../../../blog/*/*.{mp4,webm,mp3,m4a,wav,ogg}',
  {
    eager: true,
    import: 'default',
  },
) as RawAssetModule;

// @ts-ignore
const articleNestedMediaAssetModules = import.meta.glob(
  '../../../blog/*/{audio,video,media}/*.{mp4,webm,mp3,m4a,wav,ogg}',
  {
    eager: true,
    import: 'default',
  },
) as RawAssetModule;

const articleAssetModules = {
  ...articleImageAssetModules,
  ...articleCoverAssetModules,
  ...articleRootMediaAssetModules,
  ...articleNestedMediaAssetModules,
};

const DEFAULT_COVER_FILENAMES = [
  'cover.png',
  'cover.svg',
  'cover.jpg',
  'cover.jpeg',
];

const BLOG_TAG_ALIASES = {
  ai: 'tech',
  essay: 'essay',
  frontend: 'tech',
  life: 'essay',
} as const;

const BLOG_TAG_META = {
  essay: {
    label: '随笔',
    description: '更偏日常观察、生活记录和轻量表达的内容。',
    order: 80,
  },
  tech: {
    label: '技术',
    description: '和前端实现、AI 工具、工程实践相关的内容。',
    order: 10,
  },
  nodejs: blogTagMap.nodejs,
  thinking: blogTagMap.thinking,
  notes: blogTagMap.notes,
  other: blogTagMap.other,
} as const;

const BLOG_TAG_KEYS = Object.keys(BLOG_TAG_META) as Array<
  keyof typeof BLOG_TAG_META
>;

const compareDateDesc = (left: string, right: string) => {
  return Date.parse(right) - Date.parse(left);
};

const normalizeBlogTag = (tag: string): string => {
  return BLOG_TAG_ALIASES[tag as keyof typeof BLOG_TAG_ALIASES] ?? tag;
};

const normalizeBlogTags = (tags: Array<string>): Array<string> => {
  return uniq(tags.map(normalizeBlogTag));
};

const getBlogTagMeta = (tag: string) => {
  return BLOG_TAG_META[tag as keyof typeof BLOG_TAG_META] ?? blogTagMap[tag];
};

const toArticleAssetKey = (articlePath: string, assetPath: string) => {
  const normalizedArticlePath = slash(articlePath);
  const normalizedAssetPath = slash(assetPath);
  const articleDir = normalizedArticlePath.slice(
    0,
    normalizedArticlePath.lastIndexOf('/'),
  );

  if (normalizedAssetPath.startsWith('./')) {
    return `${articleDir}/${normalizedAssetPath.slice(2)}`;
  }

  return `${articleDir}/${normalizedAssetPath}`;
};

const resolveArticleCover = (sourcePath: string, cover?: string) => {
  if (cover) {
    return articleAssetModules[toArticleAssetKey(sourcePath, cover)];
  }

  for (const filename of DEFAULT_COVER_FILENAMES) {
    const coverUrl =
      articleCoverAssetModules[toArticleAssetKey(sourcePath, filename)];
    if (coverUrl) return coverUrl;
  }

  return undefined;
};

const buildBlogArticles = () => {
  return Object.entries({ ...articleSourceModules, ...simpleSourceModules })
    .map(([sourcePath, module]) => {
      const frontmatter = normalizeBlogArticleFrontmatter(
        module.frontmatter,
        sourcePath,
      );
      const normalizedSourcePath = slash(sourcePath);
      const articleDir = normalizedSourcePath.slice(
        0,
        normalizedSourcePath.lastIndexOf('/'),
      );
      const coverUrl = resolveArticleCover(sourcePath, frontmatter.cover);
      const normalizedTags: Array<string> = normalizeBlogTags(frontmatter.tags);

      return {
        ...frontmatter,
        tags: normalizedTags,
        Content: module.default,
        coverUrl,
        sourcePath,
        articleDir,
        tagLabels: normalizedTags.map(
          (tag) => getBlogTagMeta(tag)?.label ?? tag,
        ),
      };
    })
    .sort((left, right) => {
      const byPublishedAt = compareDateDesc(
        left.publishedAt,
        right.publishedAt,
      );
      if (byPublishedAt !== 0) return byPublishedAt;

      return left.title.localeCompare(right.title);
    });
};

const BLOG_ARTICLES = buildBlogArticles();

const isHiddenBlogArticle = (article: BlogArticleView) => {
  return Boolean(article.hidden);
};

const PUBLIC_BLOG_ARTICLES = BLOG_ARTICLES.filter(
  (article) => !isHiddenBlogArticle(article),
);

export function getBlogArticles(): Array<BlogArticleView> {
  return PUBLIC_BLOG_ARTICLES;
}

export function getBlogArticleBySlug(
  slug: string,
  options?: { includeHidden?: boolean },
) {
  const articles = options?.includeHidden
    ? BLOG_ARTICLES
    : PUBLIC_BLOG_ARTICLES;
  return articles.find((article) => article.slug === slug);
}

export function getBlogTagSummaries(): Array<BlogTagSummary> {
  return BLOG_TAG_KEYS.map((key) => ({
    key,
    ...BLOG_TAG_META[key],
    count: PUBLIC_BLOG_ARTICLES.filter((article) => article.tags.includes(key))
      .length,
  }))
    .filter((tag) => tag.count > 0)
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.label.localeCompare(right.label);
    });
}

export function getBlogTagByKey(tag: string) {
  return getBlogTagSummaries().find((item) => item.key === tag);
}

export function getBlogArticlesByTag(tag: string) {
  return PUBLIC_BLOG_ARTICLES.filter((article) => article.tags.includes(tag));
}

export function resolveBlogAssetUrl(
  articleSourcePath: string,
  assetPath: string,
) {
  const normalizedPath = assetPath.trim();
  if (!normalizedPath) return undefined;
  if (/^(?:https?:)?\/\//.test(normalizedPath)) return normalizedPath;
  if (/^(?:data|blob):/.test(normalizedPath)) return normalizedPath;
  if (normalizedPath.startsWith('/')) return normalizedPath;

  return articleAssetModules[
    toArticleAssetKey(articleSourcePath, normalizedPath)
  ];
}

export function formatBlogDate(value: string) {
  const isoDateMatch = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(value);
  const date = isoDateMatch
    ? new Date(
        Date.UTC(
          Number(isoDateMatch[1]),
          Number(isoDateMatch[2]) - 1,
          Number(isoDateMatch[3]),
        ),
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatBlogMeta(tags: Array<string>) {
  if (tags.length === 0) {
    return '未分类';
  }
  return tags.join(' / ');
}
