import { isValidElement } from 'react';

import '#blog/components/MarkdownFancyList.css';
import type { BlogFancyListProps } from '#blog/components/MarkdownTypes';

export function BlogMdxFancyList(props: BlogFancyListProps) {
  const { title, items, className } = props;

  return (
    <section
      className={['blog-fancy-list-block', className].filter(Boolean).join(' ')}
    >
      {title ? (
        <div className="blog-fancy-list-block-title">{title}</div>
      ) : null}
      <div className="blog-fancy-list">
        {items.map((item, index) => {
          const normalizedItem =
            typeof item === 'string' ||
            typeof item === 'number' ||
            isValidElement(item) ||
            !item ||
            typeof item !== 'object' ||
            !('content' in item)
              ? { content: item }
              : item;
          const lines = Array.isArray(normalizedItem.content)
            ? normalizedItem.content
            : [normalizedItem.content];

          return (
            <article
              key={`${normalizedItem.title ?? 'item'}-${index}`}
              className="blog-fancy-list-item"
            >
              <div className="blog-fancy-list-item-body">
                {normalizedItem.title ? (
                  <div className="blog-fancy-list-item-title">
                    {normalizedItem.title}
                  </div>
                ) : null}
                <div className="blog-fancy-list-item-copy">
                  {lines.map((line, lineIndex) => (
                    <div
                      key={`${
                        normalizedItem.title ?? 'item'
                      }-${index}-${lineIndex}`}
                      className="blog-fancy-list-item-line"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
