import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ComponentType,
  type SVGProps,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ListBulletIcon } from '@radix-ui/react-icons';
import {
  Anchor,
  Button,
  EmptyState,
  FloatButton,
  Group,
  Image as WillaImage,
  ImageGallery as WillaImageGallery,
  Lightbox,
  MathExpression,
  Mdx as Renderer,
  normalizeLightboxImage,
  type ImageGalleryProps,
  type ImageProps,
  type LightboxImage,
  type LightboxState,
  type MdxColors,
  type MdxTheme,
} from 'willa';

import type { BlogArticleFrontmatter } from '#blog/articleTypes';
import { SummaryCards } from '#blog/components/SummaryCards';
import { Columns, Column } from '#blog/components/Columns';
import {
  BLOG_TAG_QUERY_KEY,
  createBlogTagNavigation,
  formatBlogDate,
} from '#blog/pages/HomePage';

type BlogArticleHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export type ArticleView = BlogArticleFrontmatter & {
  Content: ComponentType<Record<string, unknown>>;
  coverUrl?: string;
  sourcePath: string;
  articleDir: string;
  tagLabels: Array<string>;
};

export type ArticlePageProps = {
  getArticleBySlug: (
    slug: string,
    options?: { includeHidden?: boolean },
  ) => ArticleView | undefined;
  resolveAssetUrl: (
    articleSourcePath: string,
    assetPath: string,
  ) => string | undefined;
  bgmUrl?: string;
};

const COPY = {
  articleMissing: '文章不存在。',
  backToBlogHome: '返回博客首页',
  enlargeCoverPrefix: '放大查看封面图：',
  articleMeta: '文章信息',
  articleToc: '文章目录',
  backToTop: '返回顶部',
} as const;

const BlogBackToTopIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 11.45V3.8"
        stroke="var(--blog-back-to-top-icon-color)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.2 7.1L7.5 3.8L10.8 7.1"
        stroke="var(--blog-back-to-top-icon-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BlogBgmSpeakerIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 6.1H4.9L7.85 3.8V11.2L4.9 8.9H2.5V6.1Z"
        stroke="var(--blog-article-action-solid-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 5.4C10.77 5.95 11.1 6.65 11.1 7.5C11.1 8.35 10.77 9.05 10.15 9.6"
        stroke="var(--blog-article-action-solid-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BlogBgmToggleIcon = (props: { isPlaying: boolean }) => {
  return (
    <>
      <span
        className={`blog-bgm-icon-wrap${
          props.isPlaying ? ' blog-bgm-icon-wrap--hidden' : ''
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
    </>
  );
};

const ARTICLE_MDX_COMPONENTS = {
  Column,
  Columns,
  MathExpression,
  SummaryCards,
};

const TRANSPARENT_IMAGE_BACKGROUND = 'transparent';

const ARTICLE_MDX_THEME = {
  fontFamily: 'var(--blog-body-font)',
  titleFont: 'var(--blog-title-font)',
  text: 'var(--blog-text)',
  textSoft: 'var(--blog-text-soft)',
  textFaint: 'var(--blog-text-faint)',
  textStrong: 'var(--blog-text-strong)',
  heading1: 'var(--blog-text-strong)',
  heading2: 'var(--blog-text-strong)',
  heading3: 'var(--blog-text-strong)',
  heading4: 'var(--blog-text-strong)',
  heading5: 'var(--blog-text-soft)',
  heading6: 'var(--blog-text-faint)',
  selectionBg: 'var(--blog-selection-bg)',
  selectionColor: 'inherit',
  markerColor: 'var(--blog-text-faint)',
  nestedMarkerColor: 'var(--blog-text-faint)',
  quoteColor: 'var(--blog-quote-text)',
  quoteBorder: 'var(--blog-quote-line)',
  linkColor: 'var(--blog-text-strong)',
  linkHoverColor: 'var(--blog-text-strong)',
  linkDecoration: 'var(--blog-link-decoration)',
  linkHoverDecoration: 'var(--blog-link-hover-decoration)',
} satisfies MdxTheme;

const ARTICLE_MDX_COLORS = {
  gray: 'var(--blog-color-gray)',
  blue: 'var(--blog-color-blue)',
  green: 'var(--blog-color-green)',
  cyan: 'var(--blog-color-cyan)',
  orange: 'var(--blog-color-orange)',
  red: 'var(--blog-color-red)',
  purple: 'var(--blog-color-purple)',
  pink: 'var(--blog-color-pink)',
} satisfies MdxColors;

const ARTICLE_HEADING_OFFSET = 24;

export function ArticlePage(props: ArticlePageProps) {
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
  const articleBodyRef = useRef<HTMLElement | null>(null);
  const [headings, setHeadings] = useState<Array<BlogArticleHeading>>([]);
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

  const collectArticleLightboxImages = useCallback((): Array<LightboxImage> => {
    const articleBody = articleBodyRef.current;
    if (!articleBody) return [];

    return Array.from(
      articleBody.querySelectorAll<HTMLElement>(
        'figure.willa-prose-image, figure.willa-prose-gallery-item',
      ),
    )
      .map((figure) => {
        const button = figure.querySelector<HTMLButtonElement>(
          'button[data-willa-lightbox-id]',
        );
        const img = figure.querySelector<HTMLImageElement>(
          '.willa-prose-image-asset, .willa-prose-gallery-asset',
        );
        if (!img?.src) return null;
        const caption = figure.querySelector<HTMLElement>(
          '.willa-prose-image-caption, .willa-prose-gallery-caption',
        )?.textContent;

        return {
          id: button?.dataset.willaLightboxId,
          src: img.src,
          alt: img.alt || undefined,
          caption: caption?.trim() || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, []);

  const openCoverLightbox = useCallback(() => {
    if (!article?.coverUrl) return;

    const image = normalizeLightboxImage(article.coverUrl, article.title);
    if (!image) return;

    setLightboxImages([image]);
    setLightboxIndex(0);
    setLightboxTransitionDirection(0);
    setLightboxImage(image);
  }, [article]);

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

  const articleMdxComponents = useMemo(() => {
    if (!article) return ARTICLE_MDX_COMPONENTS;

    const Image = (imageProps: ImageProps) => {
      return (
        <WillaImage
          {...imageProps}
          articleSourcePath={article.sourcePath}
          resolveAssetUrl={props.resolveAssetUrl}
          openLightbox={openLightbox}
          backgroundColor={
            imageProps.backgroundColor ?? TRANSPARENT_IMAGE_BACKGROUND
          }
        />
      );
    };

    const ImageGallery = (imageGalleryProps: ImageGalleryProps) => {
      return (
        <WillaImageGallery
          {...imageGalleryProps}
          articleSourcePath={article.sourcePath}
          resolveAssetUrl={props.resolveAssetUrl}
          openLightbox={openLightbox}
          backgroundColor={
            imageGalleryProps.backgroundColor ?? TRANSPARENT_IMAGE_BACKGROUND
          }
        />
      );
    };

    return {
      ...ARTICLE_MDX_COMPONENTS,
      img: Image,
      ImageGallery,
    };
  }, [article, openLightbox, props.resolveAssetUrl]);

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

    const handleCanPlay = () => {
      setIsBgmReady(true);
      setHasBgmError(false);
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
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }
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

  const tocItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      href: string;
      children?: Array<{ id: string; title: string; href: string }>;
    }> = [];
    let currentGroup: {
      id: string;
      title: string;
      href: string;
      children?: Array<{ id: string; title: string; href: string }>;
    } | null = null;

    headings.forEach((heading) => {
      const item = {
        id: heading.id,
        title: heading.text,
        href: `#${heading.id}`,
      };

      if (heading.level === 2) {
        currentGroup = { ...item, children: [] };
        items.push(currentGroup);
        return;
      }

      if (!currentGroup) {
        currentGroup = { ...item, children: [] };
        items.push(currentGroup);
      }

      currentGroup.children?.push(item);
    });

    return items;
  }, [headings]);

  if (!article) {
    return (
      <main className="blog-shell willa-shell">
        <EmptyState
          variant="plain"
          size="md"
          align="start"
          title={
            <span className="blog-empty-state-title">
              {COPY.articleMissing}
            </span>
          }
          className="blog-page blog-empty-state"
          actions={
            <Group
              className="blog-empty-state-actions"
              style={{ flex: 'none' }}
            >
              <Button
                href="/blog"
                variant="link"
                size="sm"
                textColor="var(--blog-text-faint)"
                hoverTextColor="var(--blog-text-strong)"
                backgroundColor="transparent"
                hoverBackgroundColor="transparent"
                className="blog-subtle-link"
                renderLink={(linkProps) => {
                  const { href, ...props } = linkProps;
                  return <Link {...props} to={href} />;
                }}
              >
                {COPY.backToBlogHome}
              </Button>
            </Group>
          }
        />
      </main>
    );
  }

  return (
    <main ref={articleRef} className="blog-shell willa-shell">
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
              onClick={openCoverLightbox}
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
              <h1 className="blog-article-title">
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
                className="blog-article-prose"
                theme={ARTICLE_MDX_THEME}
                colors={ARTICLE_MDX_COLORS}
                components={articleMdxComponents}
                openLightbox={openLightbox}
              />
            </section>
          </div>

          {headings.length ? (
            <aside
              className="blog-article-toc--side"
              aria-label={COPY.articleToc}
            >
              <span className="blog-article-toc-trigger" aria-hidden="true">
                <ListBulletIcon className="blog-article-toc-trigger-icon" />
              </span>
              <nav className="blog-article-toc blog-article-toc-panel">
                <Anchor
                  items={tocItems}
                  variant="toc"
                  size="sm"
                  showMarker={false}
                  offsetTop={ARTICLE_HEADING_OFFSET}
                  className="blog-article-toc-scroll"
                  classNames={{
                    list: 'blog-article-toc-list',
                    item: 'blog-article-toc-item',
                    link: 'blog-article-toc-link',
                    title: 'blog-article-toc-title',
                  }}
                  onItemClick={(item, event) => {
                    const target = document.getElementById(item.id);
                    if (!target) return;
                    event.preventDefault();

                    const prefersReducedMotion = window.matchMedia(
                      '(prefers-reduced-motion: reduce)',
                    ).matches;

                    target.scrollIntoView({
                      block: 'start',
                      behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    });

                    const href = item.href ?? `#${item.id}`;
                    if (window.location.hash !== href) {
                      window.history.pushState(null, '', href);
                    }
                  }}
                />
              </nav>
            </aside>
          ) : null}
        </div>

        <FloatButton
          backToTop
          ariaLabel={COPY.backToTop}
          tooltip={COPY.backToTop}
          variant="ghost"
          shape="circle"
          size="md"
          offset={[24, 24]}
          backgroundColor="transparent"
          hoverBackgroundColor="transparent"
          textColor="var(--blog-article-action-color)"
          hoverTextColor="var(--blog-article-action-hover-color)"
          className="blog-article-action blog-back-to-top"
          icon={<BlogBackToTopIcon className="blog-article-action-icon" />}
        />

        {shouldEnableBgm ? (
          <FloatButton
            type="button"
            ariaLabel={
              hasBgmError
                ? '背景音乐加载失败，点击重试'
                : isBgmPlaying
                ? '暂停背景音乐'
                : isBgmReady
                ? '播放背景音乐'
                : '背景音乐加载中'
            }
            tooltip={
              hasBgmError
                ? '背景音乐加载失败，点击重试'
                : isBgmPlaying
                ? '暂停背景音乐'
                : isBgmReady
                ? '播放背景音乐'
                : '背景音乐加载中'
            }
            variant="ghost"
            shape="circle"
            size="md"
            offset={[24, 88]}
            backgroundColor="transparent"
            hoverBackgroundColor="transparent"
            textColor="var(--blog-article-action-color)"
            hoverTextColor="var(--blog-article-action-hover-color)"
            className={`blog-article-action blog-bgm-toggle${
              isBgmPlaying ? ' blog-bgm-toggle--playing' : ''
            }${hasBgmError ? ' blog-bgm-toggle--error' : ''}${
              !isBgmReady ? ' blog-bgm-toggle--loading' : ''
            }`}
            contentClassName="blog-bgm-toggle-content"
            icon={<BlogBgmToggleIcon isPlaying={isBgmPlaying} />}
            onClick={() => handleToggleBgm()}
          />
        ) : null}

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
