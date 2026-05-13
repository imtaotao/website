import { ExternalLinkIcon, PlayIcon, VideoIcon } from '@radix-ui/react-icons';

import type {
  MediaContext,
  VideoEmbedProps,
} from '#markdown/components/MediaShared';
import '#markdown/components/VideoEmbed/index.css';

export function createVideoEmbed(context: MediaContext) {
  return function VideoEmbed({
    href,
    src,
    title,
    description,
    duration,
    provider,
    poster,
  }: VideoEmbedProps) {
    const normalizedHref = href?.trim() ?? '';
    const normalizedSrc = src?.trim() ?? '';
    const normalizedTitle = title.trim();
    const resolvedSrc = normalizedSrc
      ? context.resolveAssetUrl(context.articleSourcePath, normalizedSrc)
      : undefined;
    const resolvedPoster = poster
      ? context.resolveAssetUrl(context.articleSourcePath, poster)
      : undefined;
    const hasInlinePlayer = Boolean(resolvedSrc);
    const hasExternalLink = Boolean(normalizedHref);

    if ((!hasExternalLink && !hasInlinePlayer) || !normalizedTitle) return null;

    const content = (
      <span className="markdown-prose-video-embed-content">
        <span className="markdown-prose-video-embed-kicker">
          <VideoIcon className="markdown-prose-video-embed-inline-icon" />
          <span>{provider ? `${provider} video` : 'video'}</span>
          {duration ? (
            <span className="markdown-prose-video-embed-duration">
              {duration}
            </span>
          ) : null}
        </span>
        <span className="markdown-prose-video-embed-title">
          {normalizedTitle}
        </span>
        {description ? (
          <span className="markdown-prose-video-embed-description">
            {description}
          </span>
        ) : null}
      </span>
    );

    if (!hasInlinePlayer) {
      return (
        <a
          className="markdown-prose-video-embed"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open external video: ${normalizedTitle}`}
        >
          <span
            className="markdown-prose-video-embed-visual"
            aria-hidden="true"
          >
            {resolvedPoster ? (
              <img
                src={resolvedPoster}
                alt=""
                className="markdown-prose-video-embed-poster"
                loading="lazy"
              />
            ) : (
              <span className="markdown-prose-video-embed-fallback">
                <VideoIcon className="markdown-prose-video-embed-kind-icon" />
              </span>
            )}
            <span className="markdown-prose-video-embed-play">
              <PlayIcon />
            </span>
          </span>
          {content}
          <ExternalLinkIcon className="markdown-prose-video-embed-external" />
        </a>
      );
    }

    return (
      <article className="markdown-prose-video-embed markdown-prose-video-embed--inline">
        {content}
        {hasExternalLink ? (
          <a
            className="markdown-prose-video-embed-external-link"
            href={normalizedHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open external video: ${normalizedTitle}`}
            title="Open external video"
          >
            <ExternalLinkIcon className="markdown-prose-video-embed-external" />
          </a>
        ) : (
          <span className="markdown-prose-video-embed-external markdown-prose-video-embed-external--placeholder" />
        )}
        <div className="markdown-prose-video-embed-player-shell">
          <video
            className="markdown-prose-video-embed-player"
            controls
            preload="metadata"
            src={resolvedSrc}
          />
        </div>
      </article>
    );
  };
}
