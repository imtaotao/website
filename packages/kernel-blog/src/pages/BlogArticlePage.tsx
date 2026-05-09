import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { Link, useParams } from 'react-router';
import { ListBulletIcon, ArrowUpIcon } from '@radix-ui/react-icons';

import type { BlogArticleFrontmatter } from '#blog/articleTypes';
import {
  BlogLightbox,
  createLightboxImage,
} from '#blog/components/MarkdownLightbox';
import { BlogMdx } from '#blog/components/Markdown';
import type { LightboxImage } from '#blog/components/MarkdownTypes';
import {
  BlogThemeToggle,
  useBlogTheme,
} from '#blog/components/BlogThemeToggle';
import { formatBlogDate } from '#blog/pages/BlogHomePage';

import '#blog/pages/BlogPage.css';

type BlogArticleHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export type BlogArticleView = BlogArticleFrontmatter & {
  Content: ComponentType<Record<string, unknown>>;
  coverUrl?: string;
  sourcePath: string;
  articleDir: string;
  tagLabels: Array<string>;
};

export type BlogArticlePageProps = {
  getArticleBySlug: (
    slug: string,
    options?: { includeHidden?: boolean },
  ) => BlogArticleView | undefined;
  resolveAssetUrl: (
    articleSourcePath: string,
    assetPath: string,
  ) => string | undefined;
};

export function BlogArticlePage(props: BlogArticlePageProps) {
  const blogTheme = useBlogTheme();
  const { slug = '' } = useParams();
  const article = props.getArticleBySlug(slug, {
    includeHidden: true,
  });
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );
  const articleRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const articleBodyRef = useRef<HTMLElement | null>(null);
  const [headings, setHeadings] = useState<Array<BlogArticleHeading>>([]);
  const [tocTop, setTocTop] = useState<number | null>(null);

  useEffect(() => {
    if (!lightboxImage) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxImage]);

  useEffect(() => {
    if (!article) return;

    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
  }, [article, slug]);

  useEffect(() => {
    const articleBody = articleBodyRef.current;
    if (!articleBody) {
      setHeadings([]);
      return;
    }

    const nextHeadings = Array.from(
      articleBody.querySelectorAll<HTMLHeadingElement>('h2[id]'),
    )
      .map((heading) => ({
        id: heading.id,
        level: 2 as const,
        text: heading.textContent?.trim() ?? '',
      }))
      .filter((heading) => heading.id && heading.text);

    setHeadings(nextHeadings);
  }, [article, slug]);

  useLayoutEffect(() => {
    if (!article || headings.length === 0) {
      setTocTop(null);
      return;
    }

    const updateTocTop = () => {
      const titleEl = titleRef.current;
      if (!titleEl) return;

      const rect = titleEl.getBoundingClientRect();
      const nextTop = Math.round(rect.top + rect.height / 2 + 8);

      setTocTop((currentTop) =>
        currentTop === nextTop ? currentTop : nextTop,
      );
    };

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateTocTop);
    };

    updateTocTop();

    const ro = new ResizeObserver(schedule);
    if (articleRef.current) {
      ro.observe(articleRef.current);
    }

    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [article, headings.length, slug]);

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
    <main
      ref={articleRef}
      className="blog-shell min-h-screen"
      data-blog-theme={blogTheme.theme}
    >
      <article
        className={`blog-article-page${
          article.coverUrl ? ' blog-article-page--with-cover' : ''
        }`}
      >
        {article.coverUrl ? (
          <div className="blog-article-cover-shell">
            <button
              type="button"
              className="blog-article-cover-button"
              onClick={() =>
                setLightboxImage(
                  createLightboxImage(article.coverUrl, article.title),
                )
              }
              aria-label={`放大查看封面图：${article.title}`}
            >
              <img
                src={article.coverUrl}
                alt={article.title}
                className="blog-article-cover"
                style={
                  article.coverPosition
                    ? { objectPosition: article.coverPosition }
                    : undefined
                }
              />
            </button>
          </div>
        ) : null}

        <div className="blog-article-frame">
          <div className="blog-article-main">
            <header className="blog-article-header">
              <h1 ref={titleRef} className="blog-article-title">
                {article.title}
              </h1>

              <div className="blog-article-meta-row" aria-label="文章信息">
                <span className="blog-meta-item blog-meta-date">
                  {formatBlogDate(article.publishedAt)}
                </span>
              </div>
            </header>

            <section ref={articleBodyRef} className="blog-article-body">
              <BlogMdx
                Content={article.Content}
                articleSourcePath={article.sourcePath}
                resolveAssetUrl={props.resolveAssetUrl}
              />
            </section>
          </div>

          {headings.length ? (
            <aside
              className="blog-article-toc--side"
              aria-label="文章目录"
              style={tocTop != null ? { top: `${tocTop}px` } : undefined}
            >
              <div className="blog-article-toc-trigger" aria-hidden="true">
                <ListBulletIcon className="blog-article-toc-trigger-icon" />
              </div>
              <nav className="blog-article-toc blog-article-toc-panel">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`blog-article-toc-link blog-article-toc-link--h${heading.level}`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </aside>
          ) : null}
        </div>

        <div className="blog-article-actions" aria-label="文章操作">
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
            <ArrowUpIcon className="blog-back-to-top-icon" />
          </button>
        </div>

        {lightboxImage ? (
          <BlogLightbox
            image={lightboxImage}
            onClose={() => setLightboxImage(null)}
          />
        ) : null}
      </article>
    </main>
  );
}
