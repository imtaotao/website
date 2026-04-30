import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  BookmarkFilledIcon,
  CalendarIcon,
  CodeIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  ReaderIcon,
  ViewGridIcon,
} from '@radix-ui/react-icons';
import {
  formatBlogDate,
  formatBlogMeta,
  getBlogArticles,
  getBlogTagByKey,
  getBlogTagSummaries,
} from '#app/lib/blog';
import {
  BLOG_TAG_QUERY_KEY,
  createBlogTagNavigation,
} from '#app/lib/blogNavigation';

import '#app/pages/blog/BlogPage.css';

const getTagIcon = (tag: string) => {
  switch (tag) {
    case 'frontend':
      return CodeIcon;
    case 'notes':
      return Pencil2Icon;
    case 'thinking':
      return ReaderIcon;
    default:
      return BookmarkFilledIcon;
  }
};

export default function BlogHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const articles = getBlogArticles();
  const tags = getBlogTagSummaries();

  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const activeTag = useMemo(() => {
    const value = searchParams.get(BLOG_TAG_QUERY_KEY)?.trim() ?? '';
    return getBlogTagByKey(value) ? value : '';
  }, [searchParams]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  type SearchSuggestion =
    | {
        kind: 'article';
        key: string;
        label: string;
        meta?: string;
        href: string;
        score: number;
      }
    | {
        kind: 'tag';
        key: string;
        label: string;
        meta?: string;
        tagKey: string;
        score: number;
      };

  const computeSubsequenceScore = (needle: string, haystack: string) => {
    if (!needle || !haystack) return 0;
    let i = 0;
    let gaps = 0;
    for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
      if (haystack[j] === needle[i]) {
        i += 1;
      } else {
        gaps += 1;
      }
    }
    if (i !== needle.length) return 0;
    const compactness = Math.max(0, 1 - gaps / Math.max(needle.length * 6, 1));
    return Math.round(60 * compactness);
  };

  const searchSuggestions = useMemo((): Array<SearchSuggestion> => {
    if (!normalizedQuery) return [];

    const suggestions: Array<SearchSuggestion> = [];

    for (const tag of tags) {
      const haystack = `${tag.key} ${tag.label}`.toLowerCase();
      const includes = haystack.includes(normalizedQuery);
      const subseq = includes
        ? 0
        : computeSubsequenceScore(normalizedQuery, haystack);
      const score = includes ? 90 : subseq;
      if (score > 0) {
        suggestions.push({
          kind: 'tag',
          key: `tag:${tag.key}`,
          label: `# ${tag.label}`,
          meta: `过滤到标签 ${tag.label}`,
          tagKey: tag.key,
          score,
        });
      }
    }

    for (const article of articles) {
      const title = (article.title ?? '').toLowerCase();
      const summary = (article.summary ?? '').toLowerCase();
      const tagText = (article.tagLabels ?? []).join(' ').toLowerCase();

      let score = 0;
      if (title.includes(normalizedQuery)) {
        score += 140;
        if (title.startsWith(normalizedQuery)) score += 30;
      } else {
        score += computeSubsequenceScore(normalizedQuery, title);
      }

      if (summary.includes(normalizedQuery)) score += 45;
      if (tagText.includes(normalizedQuery)) score += 55;

      if (score > 0) {
        suggestions.push({
          kind: 'article',
          key: `article:${article.slug}`,
          label: article.title,
          meta: formatBlogMeta(article.tagLabels),
          href: `/blog/${article.slug}`,
          score,
        });
      }
    }

    return suggestions
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return left.label.localeCompare(right.label);
      })
      .slice(0, 8);
  }, [articles, normalizedQuery, tags]);

  const shouldShowSuggestions =
    isSearchFocused && Boolean(normalizedQuery) && searchSuggestions.length > 0;

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (activeTag && !article.tags.includes(activeTag)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        article.title,
        article.summary,
        ...(article.tagLabels ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeTag, articles, normalizedQuery]);

  const activeTagMeta = useMemo(() => {
    if (!activeTag) return undefined;
    return tags.find((item) => item.key === activeTag);
  }, [activeTag, tags]);

  const applySuggestion = (suggestion: SearchSuggestion) => {
    setActiveSuggestionIndex(-1);
    setIsSearchFocused(false);

    if (suggestion.kind === 'tag') {
      setQuery('');
      navigate(createBlogTagNavigation(suggestion.tagKey));
      return;
    }

    setQuery('');
    navigate(suggestion.href);
  };

  return (
    <main className="blog-shell min-h-screen">
      <header className="blog-page blog-home-header">
        <div>
          <p className="blog-kicker">
            <ReaderIcon className="blog-inline-icon" />
            <span>Blog</span>
          </p>
          <h1 className="blog-home-title">博客</h1>
          <p className="blog-home-subtitle">
            记录一些我的技术分享思考、实践和日常生活。
          </p>
        </div>
        <div className="blog-home-actions">
          <div className="blog-home-links">
            <Link to="/resume" className="blog-pill blog-home-resume">
              <FileTextIcon className="blog-pill-icon" />
              <span className="blog-pill-label">简历</span>
            </Link>
            <div className="blog-home-meta">
              <span>
                {filteredArticles.length} / {articles.length} 篇
              </span>
            </div>
          </div>

          <div className="blog-search">
            <MagnifyingGlassIcon className="blog-search-icon" />
            <input
              className="blog-search-input"
              value={query}
              placeholder="搜索标题 / 摘要 / 标签"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setIsSearchFocused(false);
                setActiveSuggestionIndex(-1);
              }}
              onKeyDown={(event) => {
                if (!shouldShowSuggestions) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) =>
                    Math.min(current + 1, searchSuggestions.length - 1),
                  );
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) =>
                    Math.max(current - 1, 0),
                  );
                }
                if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
                  event.preventDefault();
                  const suggestion = searchSuggestions[activeSuggestionIndex];
                  if (suggestion) applySuggestion(suggestion);
                }
                if (event.key === 'Escape') {
                  setIsSearchFocused(false);
                  setActiveSuggestionIndex(-1);
                }
              }}
            />
            {query ? (
              <button
                type="button"
                className="blog-search-clear"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery('');
                  setActiveSuggestionIndex(-1);
                }}
              >
                清空
              </button>
            ) : null}
            {shouldShowSuggestions ? (
              <div className="blog-search-suggest" role="listbox">
                {searchSuggestions.map((suggestion, index) => {
                  const isActive = index === activeSuggestionIndex;
                  return (
                    <button
                      key={suggestion.key}
                      type="button"
                      className={
                        isActive
                          ? 'blog-search-suggest-item blog-search-suggest-item--active'
                          : 'blog-search-suggest-item'
                      }
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <span className="blog-search-suggest-kind">
                        {suggestion.kind === 'tag' ? (
                          <BookmarkFilledIcon className="blog-inline-icon" />
                        ) : (
                          <FileTextIcon className="blog-inline-icon" />
                        )}
                      </span>
                      <span className="blog-search-suggest-main">
                        <span className="blog-search-suggest-label">
                          {suggestion.label}
                        </span>
                        {suggestion.meta ? (
                          <span className="blog-search-suggest-meta">
                            {suggestion.meta}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="blog-page blog-section" id="blog-tags">
        <div className="blog-section-header">
          <h2 className="blog-section-title">
            <BookmarkFilledIcon className="blog-inline-icon" />
            <span>标签索引</span>
          </h2>
          <span className="blog-section-meta">{tags.length} 个</span>
        </div>

        <div className="blog-tags-grid">
          <button
            type="button"
            className={
              activeTag
                ? 'blog-tags-item'
                : 'blog-tags-item blog-tags-item--active'
            }
            aria-pressed={!activeTag}
            onClick={() => navigate(createBlogTagNavigation())}
          >
            <ViewGridIcon className="blog-tags-icon" />
            <span className="blog-tags-label">全部</span>
            <span className="blog-tags-count">{articles.length}</span>
          </button>
          {tags.map((tag) => {
            const TagIcon = getTagIcon(tag.key);
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
                onClick={() => navigate(createBlogTagNavigation(tag.key))}
              >
                <TagIcon className="blog-tags-icon" />
                <span className="blog-tags-label">{tag.label}</span>
                <span className="blog-tags-count">{tag.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="blog-page blog-section blog-index-section">
        <div className="blog-section-header">
          <h2 className="blog-section-title">
            <FileTextIcon className="blog-inline-icon" />
            <span>文章索引</span>
          </h2>
          <span className="blog-section-meta">
            {activeTagMeta ? `${activeTagMeta.label} · ` : ''}
            {filteredArticles.length} 篇
          </span>
        </div>

        <div className="blog-index-grid">
          {filteredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="blog-index-item"
            >
              <div className="blog-index-meta">
                <span className="blog-index-meta-item">
                  <CalendarIcon className="blog-inline-icon" />
                  <time dateTime={article.publishedAt}>
                    {formatBlogDate(article.publishedAt)}
                  </time>
                </span>
                <span className="blog-index-meta-sep">·</span>
                <span className="blog-index-meta-item">
                  <span className="blog-index-tag-dot" aria-hidden="true" />
                  <span>{formatBlogMeta(article.tagLabels)}</span>
                </span>
              </div>
              <h3 className="blog-index-title">{article.title}</h3>
              {article.summary ? (
                <p className="blog-index-summary">{article.summary}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
