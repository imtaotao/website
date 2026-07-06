import { ListBulletIcon } from '@radix-ui/react-icons';
import { Anchor } from 'willa';

export type ArticleTocItem = {
  id: string;
  title: string;
  href: string;
  children?: Array<{ id: string; title: string; href: string }>;
};

export type ArticleTocProps = {
  items: Array<ArticleTocItem>;
  label: string;
  offsetTop: number;
};

export function ArticleToc(props: ArticleTocProps) {
  if (!props.items.length) return null;

  return (
    <aside className="blog-article-toc--side" aria-label={props.label}>
      <span className="blog-article-toc-trigger" aria-hidden="true">
        <ListBulletIcon className="blog-article-toc-trigger-icon" />
      </span>
      <nav className="blog-article-toc blog-article-toc-panel">
        <Anchor
          items={props.items}
          variant="toc"
          size="sm"
          showMarker={false}
          offsetTop={props.offsetTop}
          className="blog-article-toc-scroll"
          classNames={{
            list: 'blog-article-toc-list',
            item: 'blog-article-toc-item',
            link: 'blog-article-toc-link',
            title: 'blog-article-toc-title',
          }}
          onItemClick={(item, event) => {
            const target = document.getElementById(item.id);
            if (!target) return;
            event.preventDefault();

            const prefersReducedMotion = window.matchMedia(
              '(prefers-reduced-motion: reduce)',
            ).matches;

            target.scrollIntoView({
              block: 'start',
              behavior: prefersReducedMotion ? 'auto' : 'smooth',
            });

            const href = item.href ?? `#${item.id}`;
            if (window.location.hash !== href) {
              window.history.pushState(null, '', href);
            }
          }}
        />
      </nav>
    </aside>
  );
}
