import { ArchiveIcon, FileIcon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

import '#blog/components/MarkdownFileTree.css';
import type {
  BlogFileTreeItem,
  BlogFileTreeProps,
} from '#blog/components/MarkdownTypes';

const normalizeFileTreeItem = (item: BlogFileTreeItem) => {
  if (typeof item === 'string') {
    return {
      name: item,
      kind: item.endsWith('/') ? ('directory' as const) : ('file' as const),
    };
  }

  const kind = item.kind ?? (item.children?.length ? 'directory' : 'file');

  return {
    ...item,
    kind,
  };
};

function renderFileTreeItems(
  items: Array<BlogFileTreeItem>,
  parentKey = 'root',
) {
  return items.map((item, index) => {
    const normalizedItem = normalizeFileTreeItem(item);
    const itemKey = `${parentKey}-${normalizedItem.name}-${index}`;
    const isDirectory = normalizedItem.kind === 'directory';

    return (
      <li
        key={itemKey}
        className={[
          'blog-file-tree-item',
          isDirectory
            ? 'blog-file-tree-item--directory'
            : 'blog-file-tree-item--file',
        ].join(' ')}
      >
        <div className="blog-file-tree-entry">
          <span className="blog-file-tree-icon">
            {isDirectory ? (
              <ArchiveIcon aria-hidden="true" />
            ) : (
              <FileIcon aria-hidden="true" />
            )}
          </span>
          <code className="blog-file-tree-name">{normalizedItem.name}</code>
          {normalizedItem.description ? (
            <span className="blog-file-tree-description">
              {normalizedItem.description}
            </span>
          ) : null}
        </div>
        {normalizedItem.children?.length ? (
          <ul className="blog-file-tree-children">
            {renderFileTreeItems(normalizedItem.children, itemKey)}
          </ul>
        ) : null}
      </li>
    );
  });
}

export function BlogMdxFileTree(props: BlogFileTreeProps) {
  const { title, items, className, caption } = props;

  return (
    <section
      className={['blog-file-tree-block', className].filter(Boolean).join(' ')}
    >
      {title ? <div className="blog-file-tree-title">{title}</div> : null}
      <div className="blog-file-tree-shell">
        <ul className="blog-file-tree-root">{renderFileTreeItems(items)}</ul>
      </div>
      {caption ? <div className="blog-file-tree-caption">{caption}</div> : null}
    </section>
  );
}
