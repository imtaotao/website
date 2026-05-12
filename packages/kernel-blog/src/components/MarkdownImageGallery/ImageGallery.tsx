import { type CSSProperties, useRef } from 'react';

import { createLightboxImage } from '#blog/components/MarkdownLightbox/Lightbox';
import '#blog/components/MarkdownImage/Image.css';
import type { MarkdownMediaContext } from '#blog/components/MarkdownMediaShared/MediaShared';
import type {
  BlogImageGalleryProps,
  LightboxImage,
} from '#blog/components/MarkdownTypes';

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
        aria-label={item.alt ? `Open image: ${item.alt}` : 'Open image'}
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
