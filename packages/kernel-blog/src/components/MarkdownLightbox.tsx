import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';

import type { LightboxImage } from '#blog/components/MarkdownTypes';

type BlogLightboxProps = {
  image: LightboxImage;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export const createLightboxImage = (
  src?: string,
  alt?: string,
  caption?: string,
): LightboxImage | null => {
  if (!src) return null;
  return { src, alt, caption };
};

export function BlogLightbox(props: BlogLightboxProps) {
  return (
    <div
      className="blog-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={props.onClose}
    >
      {props.onPrev ? (
        <button
          type="button"
          className="blog-lightbox-nav blog-lightbox-nav--prev"
          onClick={(event) => {
            event.stopPropagation();
            props.onPrev?.();
          }}
          aria-label="上一张图片"
        >
          <ChevronLeftIcon />
        </button>
      ) : null}
      {props.onNext ? (
        <button
          type="button"
          className="blog-lightbox-nav blog-lightbox-nav--next"
          onClick={(event) => {
            event.stopPropagation();
            props.onNext?.();
          }}
          aria-label="下一张图片"
        >
          <ChevronRightIcon />
        </button>
      ) : null}
      <figure
        className="blog-lightbox-figure"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={props.image.src}
          alt={props.image.alt}
          className="blog-lightbox-image"
          onClick={props.onClose}
        />
        {props.image.caption ? (
          <figcaption className="blog-lightbox-caption">
            {props.image.caption}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
