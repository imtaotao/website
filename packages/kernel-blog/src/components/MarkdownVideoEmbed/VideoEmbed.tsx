import { ExternalLinkIcon, PlayIcon, VideoIcon } from '@radix-ui/react-icons';

import '#blog/components/MarkdownVideoEmbed/VideoEmbed.css';
import type {
  MarkdownMediaContext,
  VideoEmbedProps,
} from '#blog/components/MarkdownMediaShared/MediaShared';

export function createVideoEmbed(context: MarkdownMediaContext) {
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
      <span className="blog-prose-video-embed-content">
        <span className="blog-prose-video-embed-kicker">
          <VideoIcon className="blog-prose-video-embed-inline-icon" />
          <span>{provider ? `${provider} video` : 'video'}</span>
          {duration ? (
            <span className="blog-prose-video-embed-duration">{duration}</span>
          ) : null}
        </span>
        <span className="blog-prose-video-embed-title">{normalizedTitle}</span>
        {description ? (
          <span className="blog-prose-video-embed-description">
            {description}
          </span>
        ) : null}
      </span>
    );

    if (!hasInlinePlayer) {
      return (
        <a
          className="blog-prose-video-embed"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open external video: ${normalizedTitle}`}
        >
          <span className="blog-prose-video-embed-visual" aria-hidden="true">
            {resolvedPoster ? (
              <img
                src={resolvedPoster}
                alt=""
                className="blog-prose-video-embed-poster"
                loading="lazy"
              />
            ) : (
              <span className="blog-prose-video-embed-fallback">
                <VideoIcon className="blog-prose-video-embed-kind-icon" />
              </span>
            )}
            <span className="blog-prose-video-embed-play">
              <PlayIcon />
            </span>
          </span>
          {content}
          <ExternalLinkIcon className="blog-prose-video-embed-external" />
        </a>
      );
    }

    return (
      <article className="blog-prose-video-embed blog-prose-video-embed--inline">
        {content}
        {hasExternalLink ? (
          <a
            className="blog-prose-video-embed-external-link"
            href={normalizedHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open external video: ${normalizedTitle}`}
            title="Open external video"
          >
            <ExternalLinkIcon className="blog-prose-video-embed-external" />
          </a>
        ) : (
          <span className="blog-prose-video-embed-external blog-prose-video-embed-external--placeholder" />
        )}
        <div className="blog-prose-video-embed-player-shell">
          <video
            className="blog-prose-video-embed-player"
            controls
            preload="metadata"
            src={resolvedSrc}
          />
        </div>
      </article>
    );
  };
}
