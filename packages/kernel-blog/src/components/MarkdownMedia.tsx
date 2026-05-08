import type { CSSProperties, ComponentProps } from 'react';

import { createLightboxImage } from '#blog/components/MarkdownLightbox';
import type {
  BlogImageGalleryProps,
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
      ? context.resolveAssetUrl(context.articleSourcePath, p.src) ?? p.src
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
