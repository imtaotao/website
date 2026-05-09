import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import {
  BlogThemeToggle,
  useBlogTheme,
} from '#blog/components/BlogThemeToggle';
import type { BlogArticleMeta, BlogTagSummary } from '#blog/articleTypes';

import '#blog/pages/BlogPage.css';

export const BLOG_TAG_QUERY_KEY = 'tag';

export function createBlogTagNavigation(tag?: string) {
  const normalizedTag = tag?.trim();

  if (!normalizedTag) {
    return { pathname: '/blog' };
  }

  const searchParams = new URLSearchParams({
    [BLOG_TAG_QUERY_KEY]: normalizedTag,
  });

  return {
    pathname: '/blog',
    search: `?${searchParams.toString()}`,
  };
}

export type BlogHomeArticle = Pick<
  BlogArticleMeta,
  'externalUrl' | 'publishedAt' | 'slug' | 'summary' | 'tags' | 'title'
> & {
  tagLabels: Array<string>;
};

export type BlogHomePageProps = {
  articles: Array<BlogHomeArticle>;
  avatarUrl?: string;
  githubUrl?: string;
  tags: Array<BlogTagSummary>;
};

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

export function BlogHomePage(props: BlogHomePageProps) {
  const blogTheme = useBlogTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { articles, avatarUrl, githubUrl, tags } = props;

  const activeTag = useMemo(() => {
    const value = searchParams.get(BLOG_TAG_QUERY_KEY)?.trim() ?? '';
    return tags.some((item) => item.key === value) ? value : tags[0]?.key ?? '';
  }, [searchParams, tags]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (activeTag && !article.tags.includes(activeTag)) {
        return false;
      }

      return true;
    });
  }, [activeTag, articles]);

  const articlesByYear = useMemo(() => {
    const groups = new Map<string, Array<BlogHomeArticle>>();
    for (const article of filteredArticles) {
      const candidate = article.publishedAt.slice(0, 4);
      const year = /^\d{4}$/.test(candidate) ? candidate : '未知';
      const bucket = groups.get(year);
      if (bucket) {
        bucket.push(article);
      } else {
        groups.set(year, [article]);
      }
    }
    return Array.from(groups.entries());
  }, [filteredArticles]);

  const renderArticleItem = (article: BlogHomeArticle) => {
    const content = (
      <>
        <h3 className="blog-index-title">
          <span className="blog-index-title-text">{article.title}</span>
          {article.externalUrl ? (
            <span
              className="blog-index-external-icon"
              title="站外文章"
              aria-label="站外文章"
            >
              <OpenInNewWindowIcon aria-hidden="true" />
            </span>
          ) : null}
          <span className="blog-index-meta">
            <span className="blog-index-meta-item blog-index-date">
              <time dateTime={article.publishedAt}>
                {formatBlogDate(article.publishedAt)}
              </time>
            </span>
            <span className="blog-index-meta-sep">·</span>
            <span className="blog-index-meta-item">
              <span>{formatBlogMeta(article.tagLabels)}</span>
            </span>
          </span>
        </h3>
      </>
    );

    if (article.externalUrl) {
      return (
        <a
          key={article.slug}
          className="blog-index-item blog-index-item--external"
          href={article.externalUrl}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={article.slug}
        to={`/blog/${article.slug}`}
        className="blog-index-item"
      >
        {content}
      </Link>
    );
  };

  return (
    <main
      className="blog-shell blog-shell--home min-h-screen"
      data-blog-theme={blogTheme.theme}
    >
      <header className="blog-page blog-home-header">
        <div className="blog-home-identity">
          {avatarUrl ? (
            <Link
              to="/"
              className="blog-home-avatar-link"
              aria-label="返回首页"
            >
              <div className="blog-home-avatar" aria-hidden="true">
                <img
                  src={avatarUrl}
                  alt=""
                  className="blog-home-avatar-image"
                />
              </div>
            </Link>
          ) : null}
          <div>
            <p className="blog-home-subtitle">
              记录一些我的技术分享思考、实践和日常生活。
            </p>
          </div>
        </div>
        <div className="blog-home-actions">
          <div className="blog-home-links">
            <Link to="/resume" className="blog-pill blog-home-resume">
              <span className="blog-pill-label">简历</span>
            </Link>
            {githubUrl ? (
              <a
                className="blog-pill blog-home-github"
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                title="GitHub"
              >
                <span className="blog-pill-label">GitHub</span>
              </a>
            ) : null}
            <BlogThemeToggle
              theme={blogTheme.theme}
              onToggle={blogTheme.toggleTheme}
            />
          </div>
        </div>
      </header>

      <section className="blog-page blog-section" id="blog-tags">
        <div className="blog-tags-grid">
          {tags.map((tag) => {
            const isActive = tag.key === activeTag;
            return (
              <button
                key={tag.key}
                type="button"
                className={
                  isActive
                    ? 'blog-tags-item blog-tags-item--active'
                    : 'blog-tags-item'
                }
                aria-pressed={isActive}
                onClick={() =>
                  navigate(
                    createBlogTagNavigation(isActive ? undefined : tag.key),
                  )
                }
              >
                <span className="blog-tags-label">{tag.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="blog-page blog-section blog-index-section">
        {filteredArticles.length === 0 ? (
          <div className="blog-empty-state" role="status">
            <p>当前标签下还没有文章。</p>
          </div>
        ) : (
          articlesByYear.map(([year, items]) => (
            <section
              key={year}
              className="blog-year-block"
              data-count={items.length}
              data-year={year}
              aria-label={`${year} 年文章`}
            >
              <div className="blog-index-grid">
                {items.map((article) => renderArticleItem(article))}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
