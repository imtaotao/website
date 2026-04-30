import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  formatBlogDate,
  formatBlogMeta,
  getBlogArticleBySlug,
  getBlogTagByKey,
} from '#app/lib/blog';
import { BlogMdx, type MarkdownHeading } from '#app/components/blog/Markdown';

import '#app/pages/blog/BlogPage.css';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function BlogArticlePage() {
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug);

  const [headings, setHeadings] = useState<Array<MarkdownHeading>>([]);

  const [progress, setProgress] = useState(0);

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

    const nodes = Array.from(root.querySelectorAll('h2[id], h3[id]'));
    const nextHeadings = nodes
      .map((node) => {
        const level = node.tagName === 'H3' ? 3 : 2;
        const text = (node.textContent ?? '').trim();
        const id = (node as HTMLElement).id;
        return { level, text, id } as MarkdownHeading;
      })
      .filter((item) => item.text && item.id);

    setHeadings(nextHeadings);

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
      <article className="blog-page blog-article-page">
        <div className="blog-reading-progress" aria-hidden="true">
          <div
            className="blog-reading-progress-bar"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

        <Link to="/blog" className="blog-subtle-link">
          返回主菜单
        </Link>

        <header className="blog-article-header">
          <p className="blog-kicker">QUEST / ARTICLE</p>
          <div className="blog-list-meta">
            <time dateTime={article.publishedAt}>
              {formatBlogDate(article.publishedAt)}
            </time>
            <span>{formatBlogMeta(article.tagLabels)}</span>
          </div>

          <h1 className="blog-article-title">{article.title}</h1>
          <p className="blog-article-summary">{article.summary}</p>

          <div className="blog-article-tag-list">
            {article.tags.map((tag) => {
              const tagMeta = getBlogTagByKey(tag);

              return (
                <Link
                  key={tag}
                  to={`/blog/tags/${tag}`}
                  className="blog-tag-chip"
                >
                  {tagMeta?.label ?? tag}
                </Link>
              );
            })}
          </div>

          <div className="blog-article-updates">
            <time dateTime={article.publishedAt}>
              发布于 {formatBlogDate(article.publishedAt)}
            </time>
            <time dateTime={article.updatedAt}>
              更新于 {formatBlogDate(article.updatedAt)}
            </time>
          </div>
        </header>

        {article.coverUrl ? (
          <img
            src={article.coverUrl}
            alt={article.title}
            className="blog-article-cover"
          />
        ) : null}

        <div className="blog-article-layout">
          <section className="blog-article-body">
            <BlogMdx Content={article.Content} />
          </section>

          {headings.length ? (
            <aside className="blog-article-toc" aria-label="章节目录">
              <div className="blog-toc-card">
                <div className="blog-toc-title">目录</div>
                <nav className="blog-toc-list">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={
                        heading.level === 3
                          ? 'blog-toc-link blog-toc-link--l3'
                          : 'blog-toc-link'
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        const target = document.getElementById(heading.id);
                        if (!target) return;
                        window.history.replaceState(null, '', `#${heading.id}`);
                        target.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          ) : null}
        </div>
      </article>
    </main>
  );
}
