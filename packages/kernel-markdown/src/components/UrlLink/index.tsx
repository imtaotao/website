import { Link2Icon } from '@radix-ui/react-icons';

import type { UrlLinkProps } from '#markdown/components/Types';
import '#markdown/components/UrlLink/index.css';

function resolveUrlLabel(href: string) {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

export function MdxUrlLink({ href, label, children }: UrlLinkProps) {
  const normalizedHref = href.trim();

  if (!normalizedHref) return null;

  const displayLabel =
    (typeof children === 'string' && children.trim()) ||
    label?.trim() ||
    resolveUrlLabel(normalizedHref);

  return (
    <a
      className="markdown-prose-url-link"
      href={normalizedHref}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open external site: ${displayLabel}`}
    >
      <Link2Icon className="markdown-prose-url-link-icon" />
      <span className="markdown-prose-url-link-name">{displayLabel}</span>
    </a>
  );
}
