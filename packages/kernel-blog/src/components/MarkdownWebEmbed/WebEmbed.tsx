import { ExternalLinkIcon, GlobeIcon } from '@radix-ui/react-icons';
import type { CSSProperties } from 'react';

import '#blog/components/MarkdownWebEmbed/WebEmbed.css';
import type { WebEmbedProps } from '#blog/components/MarkdownMediaShared/MediaShared';

const normalizeHeight = (height?: number | string) => {
  if (typeof height === 'number' && Number.isFinite(height)) {
    return `${height}px`;
  }
  return String(height)?.trim() || '420px';
};

export function BlogMdxWebEmbed({
  src,
  href,
  title,
  description,
  provider,
  height,
  allow,
  allowFullScreen,
}: WebEmbedProps) {
  const normalizedSrc = src.trim();
  const normalizedHref = href?.trim() || normalizedSrc;
  const normalizedTitle = title.trim();

  if (!normalizedSrc || !normalizedTitle) return null;

  const frameHeight = normalizeHeight(height);

  return (
    <article className="blog-prose-web-embed">
      <div className="blog-prose-web-embed-header">
        <div className="blog-prose-web-embed-copy">
          <div className="blog-prose-web-embed-kicker">
            <GlobeIcon className="blog-prose-web-embed-icon" />
            <span>{provider ? `${provider} web` : 'web embed'}</span>
          </div>
          {normalizedHref ? (
            <a
              className="blog-prose-web-embed-title blog-prose-web-embed-title-link"
              href={normalizedHref}
              target="_blank"
              rel="noreferrer"
            >
              {normalizedTitle}
            </a>
          ) : (
            <div className="blog-prose-web-embed-title">{normalizedTitle}</div>
          )}
          {description ? (
            <p className="blog-prose-web-embed-description">{description}</p>
          ) : null}
        </div>
        {normalizedHref ? (
          <a
            className="blog-prose-web-embed-external"
            href={normalizedHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open external site: ${normalizedTitle}`}
            title="Open external site"
          >
            <ExternalLinkIcon />
          </a>
        ) : null}
      </div>
      <div
        className="blog-prose-web-embed-frame-shell"
        style={{ '--blog-web-embed-height': frameHeight } as CSSProperties}
      >
        <iframe
          className="blog-prose-web-embed-frame"
          src={normalizedSrc}
          title={normalizedTitle}
          loading="lazy"
          allow={allow}
          allowFullScreen={allowFullScreen}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </article>
  );
}
