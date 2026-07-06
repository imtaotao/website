import type { CSSProperties } from 'react';
import { Link, type LinkProps } from 'react-router';

export type ArticleHeaderProps = {
  title: string;
  backHref: LinkProps['to'];
  metaLabel: string;
  publishedAtText: string;
  enterDelay: string;
};

export function ArticleHeader(props: ArticleHeaderProps) {
  return (
    <header
      className="blog-article-header blog-enter"
      style={
        {
          '--blog-enter-delay': props.enterDelay,
        } as CSSProperties
      }
    >
      <h1 className="blog-article-title">
        <Link to={props.backHref} className="blog-article-title-link">
          {props.title}
        </Link>
      </h1>

      <div className="blog-article-meta-row" aria-label={props.metaLabel}>
        <span className="blog-meta-item blog-meta-date">
          {props.publishedAtText}
        </span>
      </div>
    </header>
  );
}
