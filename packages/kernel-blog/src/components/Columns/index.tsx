import type { ReactNode } from 'react';
import { EnterFullScreenIcon } from '@radix-ui/react-icons';
import { Dialog, Grid, IconButton } from 'willa';

export type ColumnsProps = {
  children: ReactNode;
  title?: ReactNode;
  columns?: 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
};

export type ColumnProps = {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
};

const normalizeColumns = (columns?: ColumnsProps['columns']) => {
  return columns ?? 2;
};

const normalizeGap = (gap?: ColumnsProps['gap']) => {
  return gap ?? 'md';
};

export function Columns(props: ColumnsProps) {
  const { children, className, title } = props;
  const columns = normalizeColumns(props.columns);
  const gap = normalizeGap(props.gap);

  return (
    <section
      className={['blog-columns-block', className].filter(Boolean).join(' ')}
    >
      {title ? <div className="blog-columns-title">{title}</div> : null}
      <Grid
        as="div"
        columns={columns}
        gap={gap}
        align="start"
        className="blog-columns"
      >
        {children}
      </Grid>
    </section>
  );
}

export function Column(props: ColumnProps) {
  const { children, className, title } = props;
  const expandTitle = title ?? '分栏内容';

  return (
    <div className={['blog-column', className].filter(Boolean).join(' ')}>
      <Dialog
        title={expandTitle}
        size="xl"
        className="blog-column-dialog-panel"
        overlayClassName="blog-column-dialog-overlay"
        trigger={
          <IconButton
            type="button"
            className="blog-column-expand"
            variant="ghost"
            size="sm"
            shape="square"
            ariaLabel="放大查看"
            icon={<EnterFullScreenIcon />}
          />
        }
      >
        <div className="blog-column-dialog-content">{children}</div>
      </Dialog>
      {title ? <div className="blog-column-title">{title}</div> : null}
      <div className="blog-column-body">{children}</div>
    </div>
  );
}
