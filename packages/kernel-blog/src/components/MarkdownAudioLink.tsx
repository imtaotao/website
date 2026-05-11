import {
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { useRef, useState } from 'react';

import '#blog/components/MarkdownAudioLink.css';
import {
  MediaLinkExternalAction,
  renderMediaLinkContent,
  type AudioLinkProps,
  type MarkdownMediaContext,
} from '#blog/components/MarkdownMediaShared';

export function createAudioLink(context: MarkdownMediaContext) {
  return function AudioLink({
    href,
    src,
    children,
    label,
    provider,
  }: AudioLinkProps) {
    const normalizedHref = href?.trim() ?? '';
    const normalizedSrc = src?.trim() ?? '';
    const resolvedSrc = normalizedSrc
      ? context.resolveAssetUrl(context.articleSourcePath, normalizedSrc)
      : undefined;
    const content = renderMediaLinkContent(
      children,
      provider,
      'audio',
      label?.trim(),
      normalizedHref,
    );

    if (!normalizedHref && !resolvedSrc) return null;

    if (!resolvedSrc) {
      return (
        <a
          className="blog-prose-audio-link"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
        >
          <SpeakerLoudIcon className="blog-prose-audio-link-icon" />
          {content}
          <ExternalLinkIcon className="blog-prose-media-link-external" />
        </a>
      );
    }

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const TriggerIcon = isPlaying ? PauseIcon : PlayIcon;

    return (
      <span className="blog-prose-audio-link-wrap">
        <button
          type="button"
          className={`blog-prose-audio-link blog-prose-audio-link--player${
            isPlaying ? ' blog-prose-audio-link--playing' : ''
          }`}
          onClick={async () => {
            const audio = audioRef.current;
            if (!audio) return;

            if (audio.paused) {
              try {
                await audio.play();
              } catch {
                setIsPlaying(false);
              }
              return;
            }

            audio.pause();
          }}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          <TriggerIcon className="blog-prose-audio-link-icon blog-prose-audio-link-icon--trigger" />
          {content}
        </button>
        {normalizedHref ? (
          <MediaLinkExternalAction
            href={normalizedHref}
            mediaLabel="audio"
            className="blog-prose-audio-link-external-action"
          />
        ) : null}
        <audio
          ref={audioRef}
          className="blog-prose-audio-link-audio"
          preload="none"
          src={resolvedSrc}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </span>
    );
  };
}
