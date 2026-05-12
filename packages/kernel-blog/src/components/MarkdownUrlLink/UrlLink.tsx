import { Link2Icon } from '@radix-ui/react-icons';

import '#blog/components/MarkdownUrlLink/UrlLink.css';
import type { BlogUrlLinkProps } from '#blog/components/MarkdownTypes';

function resolveUrlLabel(href: string) {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

export function BlogMdxUrlLink({ href, label, children }: BlogUrlLinkProps) {
  const normalizedHref = href.trim();

  if (!normalizedHref) return null;

  const displayLabel =
    (typeof children === 'string' && children.trim()) ||
    label?.trim() ||
    resolveUrlLabel(normalizedHref);

  return (
    <a
      className="blog-prose-url-link"
      href={normalizedHref}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open external site: ${displayLabel}`}
    >
      <Link2Icon className="blog-prose-url-link-icon" />
      <span className="blog-prose-url-link-name">{displayLabel}</span>
    </a>
  );
}
