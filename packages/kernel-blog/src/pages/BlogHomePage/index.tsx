import { useMemo, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Avatar, Button, EmptyState, Group, Stack } from 'willa';
import {
  useBlogTheme,
  BlogThemeToggle,
} from '#blog/components/BlogThemeToggle/BlogThemeToggle';
import type { BlogArticleMeta, BlogTagSummary } from '#blog/articleTypes';

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

  const getEnterStyle = (delay: number): CSSProperties =>
    ({
      '--blog-enter-delay': `${delay}ms`,
    } as CSSProperties);
  const listRenderKey = activeTag || '__all__';

  const renderArticleItem = (
    article: BlogHomeArticle,
    index: number,
    groupIndex: number,
  ) => {
    const enterStyle = getEnterStyle(520 + groupIndex * 140 + index * 96);
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
          </span>
        </h3>
      </>
    );

    if (article.externalUrl) {
      return (
        <a
          key={`${listRenderKey}:${article.slug}`}
          className="blog-index-item blog-index-item--external blog-enter"
          href={article.externalUrl}
          target="_blank"
          rel="noreferrer"
          style={enterStyle}
        >
          {content}
        </a>
      );
    }

    const articleUrl = activeTag
      ? `/blog/${article.slug}?${new URLSearchParams({
          [BLOG_TAG_QUERY_KEY]: activeTag,
        }).toString()}`
      : `/blog/${article.slug}`;

    return (
      <Link
        key={`${listRenderKey}:${article.slug}`}
        to={articleUrl}
        className="blog-index-item blog-enter"
        style={enterStyle}
      >
        {content}
      </Link>
    );
  };

  return (
    <main className="blog-shell blog-shell--home">
      <header
        className="blog-page blog-home-header blog-enter"
        style={getEnterStyle(120)}
      >
        <div className="blog-home-identity">
          {avatarUrl ? (
            <Link
              to="/"
              className="blog-home-avatar-link"
              aria-label="返回首页"
            >
              <div className="blog-home-avatar" aria-hidden="true">
                <Avatar
                  src={avatarUrl}
                  name="imtaotao"
                  className="blog-home-avatar-image"
                  shape="rounded"
                />
              </div>
            </Link>
          ) : null}
          <Stack gap="none">
            <p className="blog-home-subtitle">
              记录一些我的技术想法、实践和日常生活。
            </p>
          </Stack>
        </div>
        <Group
          direction="column"
          align="end"
          gap="10px"
          className="blog-home-actions"
        >
          <Group wrap gap="10px" align="center" className="blog-home-links">
            <Button
              href="/resume"
              variant="ghost"
              size="sm"
              textColor="var(--blog-text-soft)"
              hoverTextColor="var(--blog-text-strong)"
              backgroundColor="transparent"
              hoverBackgroundColor="transparent"
              className="blog-pill blog-home-resume"
              renderLink={(linkProps) => {
                const { href, ...props } = linkProps;
                return <Link {...props} to={href} />;
              }}
            >
              <span className="blog-pill-label">简历</span>
            </Button>
            {githubUrl ? (
              <Button
                href={githubUrl}
                variant="ghost"
                size="sm"
                target="_blank"
                rel="noreferrer"
                textColor="var(--blog-text-soft)"
                hoverTextColor="var(--blog-text-strong)"
                backgroundColor="transparent"
                hoverBackgroundColor="transparent"
                className="blog-pill blog-home-github"
                aria-label="GitHub"
                title="GitHub"
              >
                <span className="blog-pill-label">GitHub</span>
              </Button>
            ) : null}
            <BlogThemeToggle
              theme={blogTheme.theme}
              onToggle={blogTheme.toggleTheme}
            />
          </Group>
        </Group>
      </header>

      <section
        className="blog-page blog-section blog-enter"
        id="blog-tags"
        style={getEnterStyle(280)}
      >
        <Group wrap gap="12px 22px" className="blog-tags-grid">
          {tags.map((tag) => {
            const isActive = tag.key === activeTag;
            return (
              <Button
                key={tag.key}
                type="button"
                variant="ghost"
                size="sm"
                pressed={isActive}
                textColor="inherit"
                hoverTextColor="inherit"
                backgroundColor="transparent"
                hoverBackgroundColor="transparent"
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
              </Button>
            );
          })}
        </Group>
      </section>

      <section
        key={listRenderKey}
        className="blog-page blog-section blog-index-section"
        style={getEnterStyle(130)}
      >
        {filteredArticles.length === 0 ? (
          <EmptyState
            variant="plain"
            size="sm"
            align="start"
            title={
              <span className="blog-empty-state-title">
                当前标签下还没有文章。
              </span>
            }
            className="blog-empty-state blog-enter"
            role="status"
          />
        ) : (
          articlesByYear.map(([year, items], groupIndex) => (
            <section
              key={`${listRenderKey}:${year}`}
              className="blog-year-block blog-enter"
              data-count={items.length}
              data-year={year}
              aria-label={`${year} 年文章`}
              style={getEnterStyle(420 + groupIndex * 112)}
            >
              <Stack as="div" gap="none" className="blog-index-grid">
                {items.map((article, index) =>
                  renderArticleItem(article, index, groupIndex),
                )}
              </Stack>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
