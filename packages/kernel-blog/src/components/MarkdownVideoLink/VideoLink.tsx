import { ExternalLinkIcon, PlayIcon, VideoIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

import '#blog/components/MarkdownVideoLink/VideoLink.css';
import {
  MediaLinkExternalAction,
  renderMediaLinkContent,
  type MarkdownMediaContext,
  type VideoLinkProps,
} from '#blog/components/MarkdownMediaShared/MediaShared';

export function createVideoLink(context: MarkdownMediaContext) {
  return function VideoLink({
    href,
    src,
    children,
    label,
    provider,
  }: VideoLinkProps) {
    const normalizedHref = href?.trim() ?? '';
    const normalizedSrc = src?.trim() ?? '';
    const resolvedSrc = normalizedSrc
      ? context.resolveAssetUrl(context.articleSourcePath, normalizedSrc)
      : undefined;
    const content = renderMediaLinkContent(
      children,
      provider,
      'video',
      label?.trim(),
      normalizedHref,
    );

    if (!normalizedHref && !resolvedSrc) return null;

    if (!resolvedSrc) {
      return (
        <a
          className="blog-prose-video-link"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
        >
          <VideoIcon className="blog-prose-video-link-icon" />
          {content}
          <ExternalLinkIcon className="blog-prose-media-link-external" />
        </a>
      );
    }

    const [isOpen, setIsOpen] = useState(false);

    return (
      <span className="blog-prose-video-link-wrap">
        <button
          type="button"
          className={`blog-prose-video-link blog-prose-video-link--player${
            isOpen ? ' blog-prose-video-link--open' : ''
          }`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Hide video player' : 'Show video player'}
        >
          <VideoIcon className="blog-prose-video-link-icon" />
          {content}
          <PlayIcon className="blog-prose-video-link-icon blog-prose-video-link-icon--trigger" />
        </button>
        {normalizedHref ? (
          <MediaLinkExternalAction
            href={normalizedHref}
            mediaLabel="video"
            className="blog-prose-video-link-external-action"
          />
        ) : null}
        {isOpen ? (
          <span className="blog-prose-video-link-popover">
            <video
              className="blog-prose-video-link-player"
              controls
              preload="metadata"
              src={resolvedSrc}
            />
          </span>
        ) : null}
      </span>
    );
  };
}
