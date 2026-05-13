import type { ReactNode } from 'react';
import '#markdown/components/DetailsBlock/index.css';

export type MdxDetailsBlockProps = {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  className?: string;
  children?: ReactNode;
};

export function MdxDetailsBlock(props: MdxDetailsBlockProps) {
  const {
    title,
    hint = '展开 / 收起',
    defaultOpen = false,
    className,
    children,
  } = props;

  return (
    <details
      className={['markdown-details', className].filter(Boolean).join(' ')}
      open={defaultOpen}
    >
      <summary className="markdown-details-summary">
        <span className="markdown-details-summary-text">{title}</span>
        <span className="markdown-details-summary-hint">{hint}</span>
      </summary>
      <div className="markdown-details-body">{children}</div>
    </details>
  );
}
