import { Cross2Icon } from '@radix-ui/react-icons';

import type { LightboxImage } from '#blog/components/MarkdownTypes';

type BlogLightboxProps = {
  image: LightboxImage;
  onClose: () => void;
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
      <button
        type="button"
        className="blog-lightbox-close"
        onClick={props.onClose}
        aria-label="关闭图片预览"
      >
        <Cross2Icon />
      </button>
      <figure
        className="blog-lightbox-figure"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={props.image.src}
          alt={props.image.alt}
          className="blog-lightbox-image"
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
