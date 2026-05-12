import { ExternalLinkIcon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

import '#blog/components/MarkdownMediaShared/MediaShared.css';
import type {
  BlogAudioEmbedProps,
  BlogAudioLinkProps,
  BlogVideoEmbedProps,
  BlogVideoLinkProps,
  BlogWebEmbedProps,
  LightboxState,
  ResolveBlogAssetUrl,
} from '#blog/components/MarkdownTypes';

export type MarkdownMediaContext = {
  articleSourcePath: string;
  resolveAssetUrl: ResolveBlogAssetUrl;
  openLightbox: (state: LightboxState | null) => void;
};

export type AudioEmbedProps = BlogAudioEmbedProps;
export type VideoEmbedProps = BlogVideoEmbedProps;
export type AudioLinkProps = BlogAudioLinkProps;
export type VideoLinkProps = BlogVideoLinkProps;
export type WebEmbedProps = BlogWebEmbedProps;

export function renderMediaLinkContent(
  children: ReactNode,
  provider: string | undefined,
  mediaLabel: string,
  label: string | undefined,
  href: string,
) {
  return (
    children ?? (
      <span className="blog-prose-media-link-content">
        <span className="blog-prose-media-link-kicker">
          {provider ? `${provider} ${mediaLabel}` : mediaLabel}
        </span>
        <span className="blog-prose-media-link-title">{label || href}</span>
      </span>
    )
  );
}

export function MediaLinkExternalAction({
  href,
  mediaLabel,
  className,
}: {
  href: string;
  mediaLabel: string;
  className: string;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open external ${mediaLabel}`}
    >
      <ExternalLinkIcon className="blog-prose-media-link-external" />
    </a>
  );
}
