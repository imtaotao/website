import {
  BookmarkFilledIcon,
  CalendarIcon,
  ChevronRightIcon,
  FileTextIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import { Link } from 'react-router';

import { getBlogArticles, getBlogTagSummaries } from '#app/lib/blog';
import { formatBlogDate, formatBlogMeta } from '#app/lib/blog-presentation';

export function BlogHomePage() {
  const articles = getBlogArticles();
  const tags = getBlogTagSummaries();

  return (
    <main className="blog-shell min-h-screen">
      <section className="blog-page blog-home-topline">
        <div className="blog-home-topline-badge">
          <ReaderIcon className="blog-inline-icon" />
          <span>博客首页</span>
        </div>
        <div className="blog-home-topline-meta">
          <span>{articles.length} 篇文章</span>
          <span>{tags.length} 个标签</span>
        </div>
      </section>

      <section className="blog-page blog-section">
        <div className="blog-section-header">
          <h2 className="blog-section-title">
            <BookmarkFilledIcon className="blog-inline-icon" />
            <span>标签索引</span>
          </h2>
        </div>

        <div className="blog-tag-list">
          {tags.map((tag) => (
            <Link
              key={tag.key}
              to={`/blog/tags/${tag.key}`}
              className="blog-pill"
            >
              <BookmarkFilledIcon className="blog-pill-icon" />
              <span className="blog-pill-label">{tag.label}</span>
              <span className="blog-pill-count">{tag.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="blog-page blog-section blog-list-section">
        <div className="blog-section-header">
          <h2 className="blog-section-title">
            <FileTextIcon className="blog-inline-icon" />
            <span>文章列表</span>
          </h2>
          <span className="blog-section-meta">{articles.length} 篇</span>
        </div>

        <div className="blog-article-list">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="blog-list-item"
            >
              <div className="blog-list-meta">
                <span className="blog-list-meta-item">
                  <CalendarIcon className="blog-inline-icon" />
                  <time dateTime={article.publishedAt}>
                    {formatBlogDate(article.publishedAt)}
                  </time>
                </span>
                <span className="blog-list-meta-item">
                  <ChevronRightIcon className="blog-inline-icon" />
                  <span>{formatBlogMeta(article.tagLabels)}</span>
                </span>
              </div>
              <h3 className="blog-list-title">{article.title}</h3>
              <p className="blog-list-summary">{article.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
