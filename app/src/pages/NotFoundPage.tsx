import { Link } from 'react-router';
import { Button, EmptyState, Group } from 'willa';
import { usePageMeta } from '#app/lib/pageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: '页面不存在',
    description: '这个页面不存在，返回首页或继续浏览博客。',
    canonicalPath: '/404',
  });

  return (
    <main className="app__notFound">
      <EmptyState
        variant="plain"
        size="lg"
        align="start"
        className="app__notFoundInner"
        title={<span className="app__notFoundTitle">页面不存在</span>}
        description={
          <span className="app__notFoundText">
            这个地址没有对应的页面，可以返回首页，或者继续看博客文章。
          </span>
        }
        actions={
          <Group
            wrap
            gap="28px"
            align="center"
            className="app__notFoundLinks"
            style={{ flex: 'none' }}
          >
            <Button
              href="/"
              variant="link"
              size="md"
              textColor="var(--not-found-link)"
              hoverTextColor="var(--not-found-link)"
              className="app__notFoundLink"
              renderLink={(linkProps) => {
                const { href, ...props } = linkProps;
                return <Link {...props} to={href} />;
              }}
            >
              返回首页
            </Button>
            <Button
              href="/blog"
              variant="link"
              size="md"
              textColor="var(--not-found-link)"
              hoverTextColor="var(--not-found-link)"
              className="app__notFoundLink"
              renderLink={(linkProps) => {
                const { href, ...props } = linkProps;
                return <Link {...props} to={href} />;
              }}
            >
              浏览博客
            </Button>
          </Group>
        }
      />
    </main>
  );
}
