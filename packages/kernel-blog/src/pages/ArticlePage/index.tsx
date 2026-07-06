import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ComponentType,
} from 'react';
import { useParams, useSearchParams } from 'react-router';
import {
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
import { ArticleCover } from '#blog/components/ArticleCover';
import { ArticleEmptyState } from '#blog/components/ArticleEmptyState';
import { ArticleFloatingActions } from '#blog/components/ArticleFloatingActions';
import { ArticleHeader } from '#blog/components/ArticleHeader';
import { ArticleToc, type ArticleTocItem } from '#blog/components/ArticleToc';
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
    const items: Array<ArticleTocItem> = [];
    let currentGroup: ArticleTocItem | null = null;

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
        <ArticleEmptyState
          title={COPY.articleMissing}
          actionLabel={COPY.backToBlogHome}
          actionHref="/blog"
        />
      </main>
    );
  }

  return (
    <main className="blog-shell willa-shell">
      <article
        className={`blog-article-page${
          article.coverUrl ? ' blog-article-page--with-cover' : ''
        }`}
      >
        {article.coverUrl ? (
          <ArticleCover
            title={article.title}
            coverUrl={article.coverUrl}
            coverPosition={article.coverPosition}
            enlargeLabelPrefix={COPY.enlargeCoverPrefix}
            onOpen={openCoverLightbox}
          />
        ) : null}

        <div className="blog-article-frame">
          <div className="blog-article-main">
            <ArticleHeader
              title={article.title}
              backHref={createBlogTagNavigation(activeTag)}
              metaLabel={COPY.articleMeta}
              publishedAtText={formatBlogDate(article.publishedAt)}
              enterDelay={article.coverUrl ? '360ms' : '180ms'}
            />

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

          <ArticleToc
            items={tocItems}
            label={COPY.articleToc}
            offsetTop={ARTICLE_HEADING_OFFSET}
          />
        </div>

        <ArticleFloatingActions
          backToTopLabel={COPY.backToTop}
          enableBgm={shouldEnableBgm}
          isBgmReady={isBgmReady}
          isBgmPlaying={isBgmPlaying}
          hasBgmError={hasBgmError}
          onToggleBgm={handleToggleBgm}
        />

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
