import type { CSSProperties, ComponentProps } from 'react';
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
  ResolveBlogAssetUrl,
} from '#blog/components/MarkdownTypes';

type MarkdownMediaContext = {
  articleSourcePath: string;
  resolveAssetUrl: ResolveBlogAssetUrl;
  openLightbox: (image: LightboxImage | null) => void;
};

export function createBlogMdxImage(context: MarkdownMediaContext) {
  function BlogMdxImage(p: ComponentProps<'img'>) {
    const resolvedSrc = p.src
      ? context.resolveAssetUrl(context.articleSourcePath, p.src)
      : undefined;

    const image = createLightboxImage(resolvedSrc, p.alt, p.title);
    if (!resolvedSrc) return null;

    return (
      <figure className="blog-prose-image">
        <button
          type="button"
          className="blog-prose-image-button"
          onClick={() => context.openLightbox(image)}
          aria-label={p.alt ? `放大查看图片：${p.alt}` : '放大查看图片'}
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
            <button
              type="button"
              className="blog-prose-gallery-button"
              onClick={() =>
                context.openLightbox(
                  createLightboxImage(item.src, item.alt, item.caption),
                )
              }
              aria-label={
                item.alt ? `放大查看图片：${item.alt}` : '放大查看图片'
              }
            >
              <img
                src={item.src}
                alt={item.alt}
                className="blog-prose-gallery-asset"
                loading="lazy"
              />
            </button>
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
    const Icon = kind === 'audio' ? SpeakerLoudIcon : VideoIcon;
    const content = children ?? label ?? provider ?? mediaLabel;

    if (!normalizedHref) return null;

    return (
      <a
        className={`blog-prose-media-link blog-prose-media-link--${kind}`}
        href={normalizedHref}
        target="_blank"
        rel="noreferrer"
      >
        <Icon className="blog-prose-media-link-icon" />
        <span>{content}</span>
        <ExternalLinkIcon className="blog-prose-media-link-external" />
      </a>
    );
  };
}
