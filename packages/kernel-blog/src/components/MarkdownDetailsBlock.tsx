import type { ReactNode } from 'react';

export type BlogMdxDetailsBlockProps = {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  className?: string;
  children?: ReactNode;
};

export function BlogMdxDetailsBlock(props: BlogMdxDetailsBlockProps) {
  const {
    title,
    hint = '展开 / 收起',
    defaultOpen = false,
    className,
    children,
  } = props;

  return (
    <details
      className={['blog-details', className].filter(Boolean).join(' ')}
      open={defaultOpen}
    >
      <summary className="blog-details-summary">
        <span className="blog-details-summary-text">{title}</span>
        <span className="blog-details-summary-hint">{hint}</span>
      </summary>
      <div className="blog-details-body">{children}</div>
    </details>
  );
}
