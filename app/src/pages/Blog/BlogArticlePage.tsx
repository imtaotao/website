import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CalendarIcon, FileTextIcon, RocketIcon } from '@radix-ui/react-icons';

import {
  formatBlogDate,
  getBlogArticleBySlug,
  getBlogTagByKey,
} from '#app/lib/blog';
import { createBlogTagNavigation } from '#app/lib/blogNavigation';
import { BlogMdx } from '#app/components/blog/Markdown';

import '#app/pages/Blog/BlogPage.css';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function BlogArticlePage() {
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug);

  const [progress, setProgress] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      const next = max <= 0 ? 0 : clamp01(root.scrollTop / max);
      setProgress(next);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

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
      <main className="blog-shell min-h-screen">
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
    <main className="blog-shell min-h-screen">
      <article className="blog-article-page">
        <div className="blog-reading-progress" aria-hidden="true">
          <div
            className="blog-reading-progress-bar"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

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
            <Link to="/blog" className="blog-subtle-link blog-article-back">
              返回博客首页
            </Link>

            <header className="blog-article-header">
              <h1 className="blog-article-title">{article.title}</h1>

              <div className="blog-article-meta-row">
                <span className="blog-meta-item">
                  <CalendarIcon className="blog-meta-icon blog-meta-icon--blue" />
                  <span>发布于 {formatBlogDate(article.publishedAt)}</span>
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
              {article.summary ? (
                <p className="blog-article-summary">{article.summary}</p>
              ) : null}
            </header>

            <section className="blog-article-body">
              <BlogMdx
                Content={article.Content}
                articleSourcePath={article.sourcePath}
              />
            </section>
          </div>
        </div>

        <button
          type="button"
          className="blog-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="返回顶部"
        >
          <RocketIcon className="blog-back-to-top-icon" />
        </button>
      </article>
    </main>
  );
}
