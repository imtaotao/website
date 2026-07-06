import { Link } from 'react-router';
import { Button, EmptyState, Group } from 'willa';

export type ArticleEmptyStateProps = {
  title: string;
  actionLabel: string;
  actionHref: string;
};

export function ArticleEmptyState(props: ArticleEmptyStateProps) {
  return (
    <EmptyState
      variant="plain"
      size="md"
      align="start"
      title={<span className="blog-empty-state-title">{props.title}</span>}
      className="blog-page blog-empty-state"
      actions={
        <Group className="blog-empty-state-actions" style={{ flex: 'none' }}>
          <Button
            href={props.actionHref}
            variant="link"
            size="sm"
            textColor="var(--blog-text-faint)"
            hoverTextColor="var(--blog-text-strong)"
            backgroundColor="transparent"
            hoverBackgroundColor="transparent"
            className="blog-subtle-link"
            renderLink={(linkProps) => {
              const { href, ...restProps } = linkProps;
              return <Link {...restProps} to={href} />;
            }}
          >
            {props.actionLabel}
          </Button>
        </Group>
      }
    />
  );
}
