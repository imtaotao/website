import { type CSSProperties, useRef } from 'react';

import { createLightboxImage } from '#markdown/components/Lightbox';
import type { MediaContext } from '#markdown/components/MediaShared';
import type {
  LightboxImage,
  ImageGalleryProps,
} from '#markdown/components/Types';

export function createImageGallery(context: MediaContext) {
  function GalleryImageButton({ item }: { item: LightboxImage }) {
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
        className="markdown-prose-gallery-button"
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
        data-markdown-lightbox-id={item.id}
      >
        <img
          src={item.src}
          alt={item.alt}
          className="markdown-prose-gallery-asset"
          loading="lazy"
        />
      </button>
    );
  }

  return function ImageGallery({ images, columns = 2 }: ImageGalleryProps) {
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
        className="markdown-prose-gallery"
        style={
          {
            ['--markdown-gallery-columns' as string]: String(columns),
          } as CSSProperties
        }
      >
        {normalizedImages.map((item, index) => (
          <figure
            key={`${item.src}-${index}`}
            className="markdown-prose-gallery-item"
          >
            <GalleryImageButton item={lightboxImages[index] ?? item} />
            {item.caption ? (
              <figcaption className="markdown-prose-gallery-caption">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    );
  };
}
