import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';

import type { LightboxImage } from '#blog/components/MarkdownTypes';

type BlogLightboxProps = {
  image: LightboxImage;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  transitionDirection?: -1 | 0 | 1;
};

export const createLightboxImage = (
  src?: string,
  alt?: string,
  caption?: string,
  id?: string,
): LightboxImage | null => {
  if (!src) return null;
  return { src, alt, caption, id };
};

export function BlogLightbox(props: BlogLightboxProps) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipeRef = useRef(false);
  const previousImageKeyRef = useRef<string | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const [imageMotionClassName, setImageMotionClassName] = useState('');
  const transitionDirection = props.transitionDirection ?? 0;

  useEffect(() => {
    const imageKey = [
      props.image.src,
      props.image.alt ?? '',
      props.image.caption ?? '',
    ].join('::');

    if (previousImageKeyRef.current === imageKey) {
      return;
    }

    previousImageKeyRef.current = imageKey;

    if (animationTimerRef.current != null) {
      window.clearTimeout(animationTimerRef.current);
    }

    if (transitionDirection === 0) {
      setImageMotionClassName('');
      return;
    }

    setImageMotionClassName(
      transitionDirection > 0
        ? 'blog-lightbox-image--slide-next'
        : 'blog-lightbox-image--slide-prev',
    );

    animationTimerRef.current = window.setTimeout(() => {
      setImageMotionClassName('');
      animationTimerRef.current = null;
    }, 260);

    return () => {
      if (animationTimerRef.current != null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [props.image, transitionDirection]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isSwipeRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (!touch || startX == null || startY == null) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      isSwipeRef.current = true;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const changedTouch = event.changedTouches[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (!changedTouch || startX == null || startY == null) return;

    const deltaX = changedTouch.clientX - startX;
    const deltaY = changedTouch.clientY - startY;

    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 48) {
      isSwipeRef.current = false;
      return;
    }

    if (deltaX < 0) {
      props.onNext?.();
      return;
    }

    props.onPrev?.();
  };

  const handleImageClick = () => {
    if (isSwipeRef.current) {
      isSwipeRef.current = false;
      return;
    }

    props.onClose();
  };

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartXRef.current = null;
          touchStartYRef.current = null;
          isSwipeRef.current = false;
        }}
      >
        <img
          src={props.image.src}
          alt={props.image.alt}
          className={`blog-lightbox-image ${imageMotionClassName}`.trim()}
          decoding="async"
          fetchPriority="high"
          onClick={handleImageClick}
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
