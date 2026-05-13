import type { CSSProperties } from 'react';
import { ExternalLinkIcon, GlobeIcon } from '@radix-ui/react-icons';

import type { WebEmbedProps } from '#markdown/components/MediaShared';
import '#markdown/components/WebEmbed/index.css';

const normalizeHeight = (height?: number | string) => {
  if (typeof height === 'number' && Number.isFinite(height)) {
    return `${height}px`;
  }
  return String(height)?.trim() || '420px';
};

export function MdxWebEmbed({
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
    <article className="markdown-prose-web-embed">
      <div className="markdown-prose-web-embed-header">
        <div className="markdown-prose-web-embed-copy">
          <div className="markdown-prose-web-embed-kicker">
            <GlobeIcon className="markdown-prose-web-embed-icon" />
            <span>{provider ? `${provider} web` : 'web embed'}</span>
          </div>
          {normalizedHref ? (
            <a
              className="markdown-prose-web-embed-title markdown-prose-web-embed-title-link"
              href={normalizedHref}
              target="_blank"
              rel="noreferrer"
            >
              {normalizedTitle}
            </a>
          ) : (
            <div className="markdown-prose-web-embed-title">
              {normalizedTitle}
            </div>
          )}
          {description ? (
            <p className="markdown-prose-web-embed-description">
              {description}
            </p>
          ) : null}
        </div>
        {normalizedHref ? (
          <a
            className="markdown-prose-web-embed-external"
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
        className="markdown-prose-web-embed-frame-shell"
        style={{ '--markdown-web-embed-height': frameHeight } as CSSProperties}
      >
        <iframe
          className="markdown-prose-web-embed-frame"
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
