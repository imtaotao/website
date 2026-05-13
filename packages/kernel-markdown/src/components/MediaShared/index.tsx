import type { ReactNode } from 'react';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

import type {
  LightboxState,
  ResolveAssetUrl,
} from '#markdown/components/Types';
import '#markdown/components/MediaShared/index.css';

export type {
  AudioEmbedProps,
  AudioLinkProps,
  VideoEmbedProps,
  VideoLinkProps,
  WebEmbedProps,
} from '#markdown/components/Types';

export type MediaContext = {
  articleSourcePath: string;
  resolveAssetUrl: ResolveAssetUrl;
  openLightbox: (state: LightboxState | null) => void;
};

export function renderMediaLinkContent(
  children: ReactNode,
  provider: string | undefined,
  mediaLabel: string,
  label: string | undefined,
  href: string,
) {
  return (
    children ?? (
      <span className="markdown-prose-media-link-content">
        <span className="markdown-prose-media-link-kicker">
          {provider ? `${provider} ${mediaLabel}` : mediaLabel}
        </span>
        <span className="markdown-prose-media-link-title">{label || href}</span>
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
      <ExternalLinkIcon className="markdown-prose-media-link-external" />
    </a>
  );
}
