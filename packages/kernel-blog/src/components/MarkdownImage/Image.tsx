import {
  useId,
  useRef,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { createLightboxImage } from '#blog/components/MarkdownLightbox/Lightbox';
import '#blog/components/MarkdownImage/Image.css';
import type { MarkdownMediaContext } from '#blog/components/MarkdownMediaShared/MediaShared';

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
          aria-label={p.alt ? `Open image: ${p.alt}` : 'Open image'}
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
