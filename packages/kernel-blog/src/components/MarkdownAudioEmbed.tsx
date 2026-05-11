import { ExternalLinkIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';

import '#blog/components/MarkdownAudioEmbed.css';
import type {
  AudioEmbedProps,
  MarkdownMediaContext,
} from '#blog/components/MarkdownMediaShared';

export function createAudioEmbed(context: MarkdownMediaContext) {
  return function AudioEmbed({
    href,
    src,
    title,
    description,
    duration,
    provider,
  }: AudioEmbedProps) {
    const normalizedHref = href?.trim() ?? '';
    const normalizedSrc = src?.trim() ?? '';
    const normalizedTitle = title.trim();
    const resolvedSrc = normalizedSrc
      ? context.resolveAssetUrl(context.articleSourcePath, normalizedSrc)
      : undefined;
    const hasInlinePlayer = Boolean(resolvedSrc);
    const hasExternalLink = Boolean(normalizedHref);

    if ((!hasExternalLink && !hasInlinePlayer) || !normalizedTitle) return null;

    const content = (
      <span className="blog-prose-audio-embed-content">
        <span className="blog-prose-audio-embed-kicker">
          <SpeakerLoudIcon className="blog-prose-audio-embed-inline-icon" />
          <span>{provider ? `${provider} audio` : 'audio'}</span>
          {duration ? (
            <span className="blog-prose-audio-embed-duration">{duration}</span>
          ) : null}
        </span>
        <span className="blog-prose-audio-embed-title">{normalizedTitle}</span>
        {description ? (
          <span className="blog-prose-audio-embed-description">
            {description}
          </span>
        ) : null}
      </span>
    );

    if (!hasInlinePlayer) {
      return (
        <a
          className="blog-prose-audio-embed"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open external audio: ${normalizedTitle}`}
        >
          <span className="blog-prose-audio-embed-visual" aria-hidden="true">
            <span className="blog-prose-audio-embed-fallback">
              <SpeakerLoudIcon className="blog-prose-audio-embed-kind-icon" />
              <span className="blog-prose-audio-embed-wave" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            </span>
          </span>
          {content}
          <ExternalLinkIcon className="blog-prose-audio-embed-external" />
        </a>
      );
    }

    return (
      <article className="blog-prose-audio-embed blog-prose-audio-embed--inline">
        {content}
        {hasExternalLink ? (
          <a
            className="blog-prose-audio-embed-external-link"
            href={normalizedHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open external audio: ${normalizedTitle}`}
            title="Open external audio"
          >
            <ExternalLinkIcon className="blog-prose-audio-embed-external" />
          </a>
        ) : (
          <span className="blog-prose-audio-embed-external blog-prose-audio-embed-external--placeholder" />
        )}
        <div className="blog-prose-audio-embed-player-shell">
          <audio
            className="blog-prose-audio-embed-player"
            controls
            preload="none"
            src={resolvedSrc}
          />
        </div>
      </article>
    );
  };
}
