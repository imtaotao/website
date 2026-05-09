import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
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
import { useBlogTheme } from '#blog/components/BlogThemeToggle';
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

const COPY = {
  articleMissing: '\u6587\u7ae0\u4e0d\u5b58\u5728\u3002',
  backToBlogHome: '\u8fd4\u56de\u535a\u5ba2\u9996\u9875',
  enlargeCoverPrefix: '\u653e\u5927\u67e5\u770b\u5c01\u9762\u56fe\uff1a',
  articleMeta: '\u6587\u7ae0\u4fe1\u606f',
  articleToc: '\u6587\u7ae0\u76ee\u5f55',
  backToTop: '\u8fd4\u56de\u9876\u90e8',
} as const;

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
  const [showBackToTop, setShowBackToTop] = useState(false);

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
    if (!article) return;

    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 480);
    };

    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', updateBackToTopVisibility);
    };
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
    if (!article) {
      setTocTop(null);
      return;
    }

    const updateTocTop = () => {
      const titleEl = titleRef.current;
      if (!titleEl) return;

      const rect = titleEl.getBoundingClientRect();
      const nextTocTop = Math.round(rect.top + rect.height / 2 + 8);

      setTocTop((currentTop) =>
        currentTop === nextTocTop ? currentTop : nextTocTop,
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
      <main className="blog-shell" data-blog-theme={blogTheme.theme}>
        <div className="blog-page blog-empty-state">
          <p>{COPY.articleMissing}</p>
          <Link to="/blog" className="blog-subtle-link">
            {COPY.backToBlogHome}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={articleRef}
      className="blog-shell"
      data-blog-theme={blogTheme.theme}
    >
      <article
        className={`blog-article-page${
          article.coverUrl ? ' blog-article-page--with-cover' : ''
        }`}
      >
        {article.coverUrl ? (
          <div
            className="blog-article-cover-shell blog-enter"
            style={{ '--blog-enter-delay': '120ms' } as CSSProperties}
          >
            <button
              type="button"
              className="blog-article-cover-button"
              onClick={() =>
                setLightboxImage(
                  createLightboxImage(article.coverUrl, article.title),
                )
              }
              aria-label={`${COPY.enlargeCoverPrefix}${article.title}`}
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
            <header
              className="blog-article-header blog-enter"
              style={
                {
                  '--blog-enter-delay': article.coverUrl ? '360ms' : '180ms',
                } as CSSProperties
              }
            >
              <h1 ref={titleRef} className="blog-article-title">
                <Link to="/blog" className="blog-article-title-link">
                  {article.title}
                </Link>
              </h1>

              <div
                className="blog-article-meta-row"
                aria-label={COPY.articleMeta}
              >
                <span className="blog-meta-item blog-meta-date">
                  {formatBlogDate(article.publishedAt)}
                </span>
              </div>
            </header>

            <section
              ref={articleBodyRef}
              className="blog-article-body blog-enter"
              style={
                {
                  '--blog-enter-delay': article.coverUrl ? '560ms' : '320ms',
                } as CSSProperties
              }
            >
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
              aria-label={COPY.articleToc}
              style={tocTop != null ? { top: `${tocTop}px` } : undefined}
            >
              <div className="blog-article-toc-trigger" aria-hidden="true">
                <ListBulletIcon className="blog-article-toc-trigger-icon" />
              </div>
              <nav className="blog-article-toc blog-article-toc-panel">
                {headings.map((heading, index) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`blog-article-toc-link blog-article-toc-link--h${heading.level}`}
                    style={
                      {
                        '--blog-toc-link-index': index,
                      } as CSSProperties
                    }
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </aside>
          ) : null}
        </div>

        <div className="blog-article-actions" aria-label={COPY.backToTop}>
          <button
            type="button"
            className={`blog-article-action blog-back-to-top${
              showBackToTop ? ' blog-back-to-top--visible' : ''
            }`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={COPY.backToTop}
            title={COPY.backToTop}
            aria-hidden={!showBackToTop}
            tabIndex={showBackToTop ? 0 : -1}
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
