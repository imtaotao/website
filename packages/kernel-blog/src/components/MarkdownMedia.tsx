import {
  useId,
  useRef,
  type CSSProperties,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ExternalLinkIcon,
  PlayIcon,
  SpeakerLoudIcon,
  VideoIcon,
} from '@radix-ui/react-icons';

import { createLightboxImage } from '#blog/components/MarkdownLightbox';
import type {
  BlogImageGalleryProps,
  BlogMediaEmbedProps,
  BlogMediaLinkProps,
  LightboxImage,
  LightboxState,
  ResolveBlogAssetUrl,
} from '#blog/components/MarkdownTypes';

type MarkdownMediaContext = {
  articleSourcePath: string;
  resolveAssetUrl: ResolveBlogAssetUrl;
  openLightbox: (state: LightboxState | null) => void;
};

export function createBlogMdxImage(context: MarkdownMediaContext) {
  function BlogMdxImage(p: ComponentProps<'img'>) {
    const hasMovedRef = useRef(false);
    const shouldOpenRef = useRef(false);
    const lightboxId = useId();
    const resolvedSrc = p.src
      ? context.resolveAssetUrl(context.articleSourcePath, p.src)
      : undefined;

    const image = createLightboxImage(resolvedSrc, p.alt, p.title, lightboxId);
    if (!resolvedSrc) return null;

    const openImage = () => {
      context.openLightbox(
        image
          ? {
              images: [image],
              currentIndex: 0,
              selectedId: lightboxId,
              selectedImage: image,
            }
          : null,
      );
    };

    const handlePointerDown = () => {
      hasMovedRef.current = false;
      shouldOpenRef.current = false;
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (Math.abs(event.movementX) > 10 || Math.abs(event.movementY) > 10) {
        hasMovedRef.current = true;
      }
    };

    const handlePointerUp = () => {
      shouldOpenRef.current = !hasMovedRef.current;
      hasMovedRef.current = false;
    };

    const handlePointerCancel = () => {
      hasMovedRef.current = false;
      shouldOpenRef.current = false;
    };

    return (
      <figure className="blog-prose-image">
        <button
          type="button"
          className="blog-prose-image-button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={(event) => {
            if (!shouldOpenRef.current) {
              event.preventDefault();
              shouldOpenRef.current = false;
              return;
            }

            shouldOpenRef.current = false;
            openImage();
          }}
          aria-label={p.alt ? `放大查看图片：${p.alt}` : '放大查看图片'}
          data-blog-lightbox-id={lightboxId}
        >
          <img
            src={resolvedSrc}
            alt={p.alt}
            className="blog-prose-image-asset"
            loading="lazy"
          />
        </button>
        {p.title ? (
          <figcaption className="blog-prose-image-caption">
            {p.title}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  BlogMdxImage.__blogMediaElement = true;
  return BlogMdxImage;
}

export function createImageGallery(context: MarkdownMediaContext) {
  function BlogGalleryImageButton({ item }: { item: LightboxImage }) {
    const hasMovedRef = useRef(false);
    const shouldOpenRef = useRef(false);

    const openGalleryImage = () => {
      context.openLightbox(
        item.id
          ? {
              images: [item],
              currentIndex: 0,
              selectedId: item.id,
              selectedImage: item,
            }
          : null,
      );
    };

    return (
      <button
        type="button"
        className="blog-prose-gallery-button"
        onPointerDown={() => {
          hasMovedRef.current = false;
          shouldOpenRef.current = false;
        }}
        onPointerMove={(event) => {
          if (
            Math.abs(event.movementX) > 10 ||
            Math.abs(event.movementY) > 10
          ) {
            hasMovedRef.current = true;
          }
        }}
        onPointerUp={() => {
          shouldOpenRef.current = !hasMovedRef.current;
          hasMovedRef.current = false;
        }}
        onPointerCancel={() => {
          hasMovedRef.current = false;
          shouldOpenRef.current = false;
        }}
        onClick={(event) => {
          if (!shouldOpenRef.current) {
            event.preventDefault();
            shouldOpenRef.current = false;
            return;
          }

          shouldOpenRef.current = false;
          openGalleryImage();
        }}
        aria-label={item.alt ? `放大查看图片：${item.alt}` : '放大查看图片'}
        data-blog-lightbox-id={item.id}
      >
        <img
          src={item.src}
          alt={item.alt}
          className="blog-prose-gallery-asset"
          loading="lazy"
        />
      </button>
    );
  }

  return function ImageGallery({ images, columns = 2 }: BlogImageGalleryProps) {
    const normalizedImages = images
      .map((item) => (typeof item === 'string' ? { src: item } : { ...item }))
      .map((item) => {
        const resolvedSrc = context.resolveAssetUrl(
          context.articleSourcePath,
          item.src,
        );
        return resolvedSrc ? { ...item, src: resolvedSrc } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const lightboxImages = normalizedImages.map((item, index) =>
      createLightboxImage(
        item.src,
        item.alt,
        item.caption,
        `${item.src}::${index}`,
      ),
    );

    if (!normalizedImages.length) return null;

    return (
      <div
        className="blog-prose-gallery"
        style={
          {
            ['--blog-gallery-columns' as string]: String(columns),
          } as CSSProperties
        }
      >
        {normalizedImages.map((item, index) => (
          <figure
            key={`${item.src}-${index}`}
            className="blog-prose-gallery-item"
          >
            <BlogGalleryImageButton item={lightboxImages[index] ?? item} />
            {item.caption ? (
              <figcaption className="blog-prose-gallery-caption">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    );
  };
}

export function createMediaEmbed(context: MarkdownMediaContext) {
  function MediaEmbed({
    href,
    title,
    type = 'video',
    description,
    duration,
    poster,
    provider,
  }: BlogMediaEmbedProps) {
    const normalizedHref = href.trim();
    const normalizedTitle = title.trim();
    const kind = type === 'audio' ? 'audio' : 'video';
    const resolvedPoster = poster
      ? context.resolveAssetUrl(context.articleSourcePath, poster)
      : undefined;

    if (!normalizedHref || !normalizedTitle) return null;

    const mediaLabel = kind === 'audio' ? '音频' : '视频';
    const Icon = kind === 'audio' ? SpeakerLoudIcon : VideoIcon;
    const showPoster = kind === 'video' && resolvedPoster;

    return (
      <a
        className={`blog-prose-media-embed blog-prose-media-embed--${kind}`}
        href={normalizedHref}
        target="_blank"
        rel="noreferrer"
        aria-label={`打开外部${mediaLabel}：${normalizedTitle}`}
      >
        <span className="blog-prose-media-visual" aria-hidden="true">
          {showPoster ? (
            <img
              src={resolvedPoster}
              alt=""
              className="blog-prose-media-poster"
              loading="lazy"
            />
          ) : (
            <span className="blog-prose-media-fallback">
              <Icon className="blog-prose-media-kind-icon" />
              {kind === 'audio' ? (
                <span className="blog-prose-media-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </span>
          )}
          {kind === 'video' ? (
            <span className="blog-prose-media-play">
              <PlayIcon />
            </span>
          ) : null}
        </span>
        <span className="blog-prose-media-content">
          <span className="blog-prose-media-kicker">
            <Icon className="blog-prose-media-inline-icon" />
            <span>{provider ? `${provider} ${mediaLabel}` : mediaLabel}</span>
            {duration ? (
              <span className="blog-prose-media-duration">{duration}</span>
            ) : null}
          </span>
          <span className="blog-prose-media-title">{normalizedTitle}</span>
          {description ? (
            <span className="blog-prose-media-description">{description}</span>
          ) : null}
        </span>
        <ExternalLinkIcon className="blog-prose-media-external" />
      </a>
    );
  }

  MediaEmbed.__blogMediaElement = true;
  return MediaEmbed;
}

export function createMediaLink() {
  return function MediaLink({
    href,
    type = 'video',
    children,
    label,
    provider,
  }: BlogMediaLinkProps) {
    const normalizedHref = href.trim();
    const kind = type === 'audio' ? 'audio' : 'video';
    const mediaLabel = kind === 'audio' ? '音频' : '视频';
    const normalizedLabel = label?.trim();

    if (!normalizedHref) return null;

    return (
      <a
        className="blog-prose-media-link"
        href={normalizedHref}
        target="_blank"
        rel="noreferrer"
      >
        {children ?? (
          <span className="blog-prose-media-link-content">
            <span className="blog-prose-media-link-kicker">
              {provider ? `${provider} ${mediaLabel}` : mediaLabel}
            </span>
            <span className="blog-prose-media-link-title">
              {normalizedLabel || normalizedHref}
            </span>
          </span>
        )}
        <ExternalLinkIcon className="blog-prose-media-link-icon" />
      </a>
    );
  };
}
