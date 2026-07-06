import type { CSSProperties } from 'react';

export type ArticleCoverProps = {
  title: string;
  coverUrl: string;
  coverPosition?: string;
  enlargeLabelPrefix: string;
  onOpen: () => void;
};

export function ArticleCover(props: ArticleCoverProps) {
  return (
    <div
      className="blog-article-cover-shell blog-enter"
      style={{ '--blog-enter-delay': '120ms' } as CSSProperties}
    >
      <button
        type="button"
        className="blog-article-cover-button"
        onClick={props.onOpen}
        aria-label={`${props.enlargeLabelPrefix}${props.title}`}
      >
        <img
          src={props.coverUrl}
          alt={props.title}
          className="blog-article-cover"
          style={
            props.coverPosition
              ? { objectPosition: props.coverPosition }
              : undefined
          }
        />
      </button>
    </div>
  );
}
