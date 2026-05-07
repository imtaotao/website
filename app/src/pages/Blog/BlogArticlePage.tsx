import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeftIcon,
  CalendarIcon,
  FileTextIcon,
  RocketIcon,
} from '@radix-ui/react-icons';

import {
  formatBlogDate,
  getBlogArticleBySlug,
  getBlogTagByKey,
} from '#app/lib/blog';
import { createBlogTagNavigation } from '#app/lib/blogNavigation';
import { BlogMdx } from '#app/components/blog/Markdown';
import {
  BlogThemeToggle,
  useBlogTheme,
} from '#app/components/blog/BlogThemeToggle';

import '#app/pages/Blog/BlogPage.css';

export default function BlogArticlePage() {
  const blogTheme = useBlogTheme();
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug, {
    includeHidden: true,
  });

  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (!article) return;

    const root = document.querySelector('.blog-article-body');
    if (!root) return;

    const text = (root.textContent ?? '').trim();
    const latinWords = text
      .replace(/[\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const cjkChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;

    setWordCount(latinWords + cjkChars);

    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
  }, [article, slug]);

  if (!article) {
    return (
      <main
        className="blog-shell min-h-screen"
        data-blog-theme={blogTheme.theme}
      >
        <div className="blog-page blog-empty-state">
          <p>文章不存在。</p>
          <Link to="/blog" className="blog-subtle-link">
            返回博客首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="blog-shell min-h-screen" data-blog-theme={blogTheme.theme}>
      <article className="blog-article-page">
        {article.coverUrl ? (
          <div className="blog-article-cover-shell">
            <img
              src={article.coverUrl}
              alt={article.title}
              className="blog-article-cover"
            />
          </div>
        ) : null}

        <div className="blog-article-frame">
          <div className="blog-article-main">
            <header className="blog-article-header">
              <h1 className="blog-article-title">{article.title}</h1>

              <div className="blog-article-meta-row" aria-label="文章信息">
                <span className="blog-meta-item">
                  <CalendarIcon className="blog-meta-icon blog-meta-icon--blue" />
                  <span>{formatBlogDate(article.publishedAt)}</span>
                </span>
                {wordCount ? (
                  <span className="blog-meta-item">
                    <FileTextIcon className="blog-meta-icon blog-meta-icon--amber" />
                    <span>{wordCount} 字</span>
                  </span>
                ) : null}
                {article.tags.map((tag) => {
                  const tagMeta = getBlogTagByKey(tag);

                  return (
                    <Link
                      key={tag}
                      to={createBlogTagNavigation(tag)}
                      className="blog-tag-chip"
                    >
                      {tagMeta?.label ?? tag}
                    </Link>
                  );
                })}
              </div>
            </header>

            <section className="blog-article-body">
              <BlogMdx
                Content={article.Content}
                articleSourcePath={article.sourcePath}
              />
            </section>
          </div>
        </div>

        <div className="blog-article-actions" aria-label="文章操作">
          <Link
            to="/blog"
            className="blog-article-action blog-article-back"
            aria-label="返回博客首页"
            title="返回博客首页"
          >
            <ArrowLeftIcon className="blog-article-action-icon" />
          </Link>
          <BlogThemeToggle
            theme={blogTheme.theme}
            onToggle={blogTheme.toggleTheme}
          />
          <button
            type="button"
            className="blog-article-action blog-back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="返回顶部"
            title="返回顶部"
          >
            <RocketIcon className="blog-back-to-top-icon" />
          </button>
        </div>
      </article>
    </main>
  );
}
