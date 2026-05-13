import { useState } from 'react';
import { ExternalLinkIcon, PlayIcon, VideoIcon } from '@radix-ui/react-icons';

import {
  MediaLinkExternalAction,
  renderMediaLinkContent,
  type MediaContext,
  type VideoLinkProps,
} from '#markdown/components/MediaShared';
import '#markdown/components/VideoLink/index.css';

export function createVideoLink(context: MediaContext) {
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
          className="markdown-prose-video-link"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
        >
          <VideoIcon className="markdown-prose-video-link-icon" />
          {content}
          <ExternalLinkIcon className="markdown-prose-media-link-external" />
        </a>
      );
    }

    const [isOpen, setIsOpen] = useState(false);

    return (
      <span className="markdown-prose-video-link-wrap">
        <button
          type="button"
          className={`markdown-prose-video-link markdown-prose-video-link--player${
            isOpen ? ' markdown-prose-video-link--open' : ''
          }`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Hide video player' : 'Show video player'}
        >
          <VideoIcon className="markdown-prose-video-link-icon" />
          {content}
          <PlayIcon className="markdown-prose-video-link-icon markdown-prose-video-link-icon--trigger" />
        </button>
        {normalizedHref ? (
          <MediaLinkExternalAction
            href={normalizedHref}
            mediaLabel="video"
            className="markdown-prose-video-link-external-action"
          />
        ) : null}
        {isOpen ? (
          <span className="markdown-prose-video-link-popover">
            <video
              className="markdown-prose-video-link-player"
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
