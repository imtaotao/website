import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ComponentType,
  type SVGProps,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  ListBulletIcon,
  ArrowUpIcon,
  CaretUpIcon,
} from '@radix-ui/react-icons';
import {
  Lightbox,
  Renderer,
  createLightboxImage,
  type LightboxImage,
  type LightboxState,
} from '@website-kernel/markdown';

import type { BlogArticleFrontmatter } from '#blog/articleTypes';
import { useBlogTheme } from '#blog/components/BlogThemeToggle/BlogThemeToggle';
import {
  BLOG_TAG_QUERY_KEY,
  createBlogTagNavigation,
  formatBlogDate,
} from '#blog/pages/BlogHomePage';

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
  bgmUrl?: string;
};

const COPY = {
  articleMissing: '\u6587\u7ae0\u4e0d\u5b58\u5728\u3002',
  backToBlogHome: '\u8fd4\u56de\u535a\u5ba2\u9996\u9875',
  enlargeCoverPrefix: '\u653e\u5927\u67e5\u770b\u5c01\u9762\u56fe\uff1a',
  articleMeta: '\u6587\u7ae0\u4fe1\u606f',
  articleToc: '\u6587\u7ae0\u76ee\u5f55',
  backToTop: '\u8fd4\u56de\u9876\u90e8',
} as const;

function BlogBgmSpeakerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 6.1H4.9L7.85 3.8V11.2L4.9 8.9H2.5V6.1Z"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 5.4C10.77 5.95 11.1 6.65 11.1 7.5C11.1 8.35 10.77 9.05 10.15 9.6"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlogArticlePage(props: BlogArticlePageProps) {
  const blogTheme = useBlogTheme();
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const article = props.getArticleBySlug(slug, {
    includeHidden: true,
  });
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );
  const [lightboxImages, setLightboxImages] = useState<Array<LightboxImage>>(
    [],
  );
  const [, setLightboxIndex] = useState(0);
  const [lightboxTransitionDirection, setLightboxTransitionDirection] =
    useState<-1 | 0 | 1>(0);
  const articleRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const articleBodyRef = useRef<HTMLElement | null>(null);
  const [headings, setHeadings] = useState<Array<BlogArticleHeading>>([]);
  const [tocTop, setTocTop] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isBgmReady, setIsBgmReady] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [hasBgmError, setHasBgmError] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const activeTag = useMemo(() => {
    const value = searchParams.get(BLOG_TAG_QUERY_KEY)?.trim() ?? '';
    if (!value || !article) return '';
    return article.tags.includes(value) ? value : '';
  }, [article, searchParams]);
  const shouldEnableBgm = Boolean(article?.bgm && props.bgmUrl);
  const scrollToTop = useCallback(() => {
    const scrollElement =
      document.scrollingElement ?? document.documentElement ?? document.body;

    if (scrollElement && 'scrollTo' in scrollElement) {
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const collectArticleLightboxImages = useCallback((): Array<LightboxImage> => {
    const articleBody = articleBodyRef.current;
    if (!articleBody) return [];

    return Array.from(
      articleBody.querySelectorAll<HTMLElement>(
        'figure.markdown-prose-image, figure.markdown-prose-gallery-item',
      ),
    )
      .map((figure) => {
        const button = figure.querySelector<HTMLButtonElement>(
          'button[data-markdown-lightbox-id]',
        );
        const img = figure.querySelector<HTMLImageElement>(
          '.markdown-prose-image-asset, .markdown-prose-gallery-asset',
        );
        if (!img?.src) return null;
        const caption = figure.querySelector<HTMLElement>(
          '.markdown-prose-image-caption, .markdown-prose-gallery-caption',
        )?.textContent;

        return {
          id: button?.dataset.markdownLightboxId,
          src: img.src,
          alt: img.alt || undefined,
          caption: caption?.trim() || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, []);

  const openLightbox = useCallback(
    (state: LightboxState | null) => {
      if (!state || !state.images.length) return;

      const fallbackImages =
        state.images.length === 1 ? collectArticleLightboxImages() : [];
      const resolvedImages =
        fallbackImages.length > 1 ? fallbackImages : state.images;
      const assertValidIndex = (index: number, label: string) => {
        if (!Number.isInteger(index)) {
          throw new Error(`Invalid ${label}: must be an integer.`);
        }
        if (index < 0 || index >= resolvedImages.length) {
          throw new Error(
            `Invalid ${label}: ${index} is out of bounds for ${resolvedImages.length} images.`,
          );
        }
        return index;
      };

      let nextIndex: number;

      if (state.selectedId != null) {
        nextIndex = resolvedImages.findIndex(
          (item) => item.id === state.selectedId,
        );
        if (nextIndex < 0) {
          throw new Error(`Invalid selectedId: ${state.selectedId} not found.`);
        }
      } else if (state.selectedIndex != null) {
        nextIndex = assertValidIndex(state.selectedIndex, 'selectedIndex');
      } else if (state.selectedImage != null) {
        nextIndex = resolvedImages.findIndex(
          (item) =>
            item.src === state.selectedImage?.src &&
            item.caption === state.selectedImage?.caption &&
            item.alt === state.selectedImage?.alt,
        );
        if (nextIndex < 0) {
          throw new Error('Invalid selectedImage: image not found.');
        }
      } else {
        nextIndex = assertValidIndex(state.currentIndex, 'currentIndex');
      }

      setLightboxImages(resolvedImages);
      setLightboxIndex(nextIndex);
      setLightboxTransitionDirection(0);
      setLightboxImage(resolvedImages[nextIndex] ?? null);
    },
    [collectArticleLightboxImages],
  );

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    setLightboxImages([]);
    setLightboxIndex(0);
    setLightboxTransitionDirection(0);
  }, []);

  const handleLightboxStep = useCallback(
    (direction: -1 | 1) => {
      if (lightboxImages.length <= 1) return;
      setLightboxIndex((currentIndex) => {
        const nextIndex =
          (currentIndex + direction + lightboxImages.length) %
          lightboxImages.length;
        setLightboxTransitionDirection(direction);
        setLightboxImage(lightboxImages[nextIndex] ?? null);
        return nextIndex;
      });
    },
    [lightboxImages],
  );

  useEffect(() => {
    if (!lightboxImage) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft' && lightboxImages.length > 1) {
        handleLightboxStep(-1);
        return;
      }
      if (event.key === 'ArrowRight' && lightboxImages.length > 1) {
        handleLightboxStep(1);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxImage, lightboxImages]);

  useEffect(() => {
    if (!shouldEnableBgm) {
      bgmRef.current?.pause();
      bgmRef.current = null;
      setIsBgmReady(false);
      setIsBgmPlaying(false);
      setHasBgmError(false);
      return;
    }

    const audio = new Audio(props.bgmUrl);
    audio.preload = 'metadata';
    audio.loop = true;
    audio.volume = 0.28;
    bgmRef.current = audio;

    const tryAutoPlay = async () => {
      try {
        await audio.play();
        setHasBgmError(false);
      } catch {
        setIsBgmPlaying(false);
      }
    };

    const handleCanPlay = () => {
      setIsBgmReady(true);
      setHasBgmError(false);
      void tryAutoPlay();
    };
    const handlePlay = () => setIsBgmPlaying(true);
    const handlePause = () => setIsBgmPlaying(false);
    const handleError = () => {
      setHasBgmError(true);
      setIsBgmReady(false);
      setIsBgmPlaying(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      if (bgmRef.current === audio) {
        bgmRef.current = null;
      }
    };
  }, [props.bgmUrl, shouldEnableBgm, slug]);

  const handleToggleBgm = async () => {
    const audio = bgmRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
      setHasBgmError(false);
    } catch {
      setHasBgmError(true);
      setIsBgmPlaying(false);
    }
  };

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

    const scrollElement =
      document.scrollingElement ?? document.documentElement ?? document.body;

    const updateBackToTopVisibility = () => {
      const scrollTop =
        scrollElement?.scrollTop ??
        window.scrollY ??
        document.documentElement.scrollTop ??
        document.body.scrollTop ??
        0;

      setShowBackToTop(scrollTop > 480);
    };

    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, {
      passive: true,
    });
    scrollElement?.addEventListener('scroll', updateBackToTopVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', updateBackToTopVisibility);
      scrollElement?.removeEventListener('scroll', updateBackToTopVisibility);
    };
  }, [article, slug]);

  useEffect(() => {
    const articleBody = articleBodyRef.current;
    if (!articleBody) {
      setHeadings([]);
      return;
    }

    const nextHeadings = Array.from(
      articleBody.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]'),
    )
      .map((heading) => ({
        id: heading.id,
        level: heading.tagName === 'H3' ? (3 as const) : (2 as const),
        text: heading.textContent?.trim() ?? '',
      }))
      .filter((heading) => heading.id && heading.text);

    setHeadings(nextHeadings);
  }, [article, slug]);

  useEffect(() => {
    setIsTocOpen(false);
  }, [slug]);

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
      <main
        className="blog-shell markdown-shell"
        data-blog-theme={blogTheme.theme}
        data-markdown-theme={blogTheme.theme}
      >
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
      className="blog-shell markdown-shell"
      data-blog-theme={blogTheme.theme}
      data-markdown-theme={blogTheme.theme}
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
                openLightbox({
                  images: [
                    createLightboxImage(article.coverUrl, article.title),
                  ].filter((item): item is LightboxImage => Boolean(item)),
                  currentIndex: 0,
                })
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
                <Link
                  to={createBlogTagNavigation(activeTag)}
                  className="blog-article-title-link"
                >
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
              <Renderer
                Content={article.Content}
                articleSourcePath={article.sourcePath}
                resolveAssetUrl={props.resolveAssetUrl}
                openLightbox={openLightbox}
              />
            </section>
          </div>

          {headings.length ? (
            <aside
              className={`blog-article-toc--side${
                isTocOpen ? ' blog-article-toc--open' : ''
              }`}
              aria-label={COPY.articleToc}
              style={tocTop != null ? { top: `${tocTop}px` } : undefined}
            >
              <button
                type="button"
                className="blog-article-toc-trigger"
                aria-label={COPY.articleToc}
                aria-expanded={isTocOpen}
                onClick={() => setIsTocOpen((current) => !current)}
              >
                <ListBulletIcon className="blog-article-toc-trigger-icon" />
              </button>
              <nav className="blog-article-toc blog-article-toc-panel">
                {headings.map((heading, index) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`blog-article-toc-link blog-article-toc-link--h${heading.level}`}
                    onClick={() => setIsTocOpen(false)}
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
            onClick={scrollToTop}
            aria-label={COPY.backToTop}
            title={COPY.backToTop}
            aria-hidden={!showBackToTop}
            tabIndex={showBackToTop ? 0 : -1}
          >
            <ArrowUpIcon className="blog-back-to-top-icon blog-back-to-top-icon--desktop" />
            <CaretUpIcon className="blog-back-to-top-icon blog-back-to-top-icon--mobile" />
          </button>

          {shouldEnableBgm ? (
            <button
              type="button"
              className={`blog-article-action blog-bgm-toggle${
                isBgmPlaying ? ' blog-bgm-toggle--playing' : ''
              }${hasBgmError ? ' blog-bgm-toggle--error' : ''}${
                !isBgmReady ? ' blog-bgm-toggle--loading' : ''
              }`}
              onClick={() => {
                handleToggleBgm();
              }}
              aria-label={
                hasBgmError
                  ? '背景音乐加载失败，点击重试'
                  : isBgmPlaying
                  ? '暂停背景音乐'
                  : '播放背景音乐'
              }
              title={
                hasBgmError
                  ? '背景音乐加载失败，点击重试'
                  : isBgmPlaying
                  ? '暂停背景音乐'
                  : isBgmReady
                  ? '播放背景音乐'
                  : '背景音乐加载中'
              }
            >
              <span
                className={`blog-bgm-icon-wrap${
                  isBgmPlaying ? ' blog-bgm-icon-wrap--hidden' : ''
                }`}
                aria-hidden="true"
              >
                <BlogBgmSpeakerIcon className="blog-article-action-icon" />
              </span>
              <span className="blog-bgm-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          ) : null}
        </div>

        {lightboxImage ? (
          <Lightbox
            image={lightboxImage}
            onClose={closeLightbox}
            transitionDirection={lightboxTransitionDirection}
            onPrev={
              lightboxImages.length > 1
                ? () => handleLightboxStep(-1)
                : undefined
            }
            onNext={
              lightboxImages.length > 1
                ? () => handleLightboxStep(1)
                : undefined
            }
          />
        ) : null}
      </article>
    </main>
  );
}
