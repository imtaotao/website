import { isValidElement } from 'react';

import type { FancyListProps } from '#markdown/components/Types';
import '#markdown/components/FancyList/index.css';

export function MdxFancyList(props: FancyListProps) {
  const { title, items, className } = props;

  return (
    <section
      className={['markdown-fancy-list-block', className]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? (
        <div className="markdown-fancy-list-block-title">{title}</div>
      ) : null}
      <div className="markdown-fancy-list">
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
              className="markdown-fancy-list-item"
            >
              <div className="markdown-fancy-list-item-body">
                {normalizedItem.title ? (
                  <div className="markdown-fancy-list-item-title">
                    {normalizedItem.title}
                  </div>
                ) : null}
                <div className="markdown-fancy-list-item-copy">
                  {lines.map((line, lineIndex) => (
                    <div
                      key={`${
                        normalizedItem.title ?? 'item'
                      }-${index}-${lineIndex}`}
                      className="markdown-fancy-list-item-line"
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
