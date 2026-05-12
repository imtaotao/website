import {
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';

import {
  MediaLinkExternalAction,
  renderMediaLinkContent,
  type AudioLinkProps,
  type MediaContext,
} from '#markdown/components/MediaShared';

export function createAudioLink(context: MediaContext) {
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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(Boolean(resolvedSrc));
    const [loadError, setLoadError] = useState<string | null>(null);
    const content = renderMediaLinkContent(
      children,
      provider,
      'audio',
      label?.trim(),
      normalizedHref,
    );

    useEffect(() => {
      setIsPlaying(false);
      setIsReady(false);
      setIsLoading(Boolean(resolvedSrc));
      setLoadError(null);
    }, [resolvedSrc]);

    if (!normalizedHref && !resolvedSrc) return null;

    if (!resolvedSrc) {
      return (
        <a
          className="markdown-prose-audio-link"
          href={normalizedHref}
          target="_blank"
          rel="noreferrer"
        >
          <SpeakerLoudIcon className="markdown-prose-audio-link-icon" />
          {content}
          <ExternalLinkIcon className="markdown-prose-media-link-external" />
        </a>
      );
    }
    const statusLabel = loadError
      ? 'audio unavailable'
      : isLoading
      ? 'loading'
      : !isReady
      ? 'loading'
      : null;

    return (
      <span className="markdown-prose-audio-link-wrap">
        <button
          type="button"
          className={`markdown-prose-audio-link markdown-prose-audio-link--player${
            isPlaying ? ' markdown-prose-audio-link--playing' : ''
          }${isLoading ? ' markdown-prose-audio-link--loading' : ''}${
            loadError ? ' markdown-prose-audio-link--error' : ''
          }`}
          onClick={async () => {
            const audio = audioRef.current;
            if (!audio || loadError) return;

            if (audio.paused) {
              setIsLoading(true);
              try {
                await audio.play();
              } catch {
                setIsPlaying(false);
                setIsLoading(false);
              }
              return;
            }

            audio.pause();
          }}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          aria-busy={isLoading}
          disabled={Boolean(loadError)}
          title={statusLabel ?? undefined}
        >
          <span
            className="markdown-prose-audio-link-trigger"
            aria-hidden="true"
            data-state={isPlaying ? 'playing' : 'idle'}
          >
            <PlayIcon className="markdown-prose-audio-link-icon markdown-prose-audio-link-icon--trigger markdown-prose-audio-link-icon--play" />
            <PauseIcon className="markdown-prose-audio-link-icon markdown-prose-audio-link-icon--trigger markdown-prose-audio-link-icon--pause" />
          </span>
          {content}
          <span
            className="markdown-prose-audio-link-status"
            data-visible={statusLabel ? 'true' : 'false'}
            aria-hidden={statusLabel ? undefined : true}
          >
            {statusLabel ?? ''}
          </span>
        </button>
        {normalizedHref ? (
          <MediaLinkExternalAction
            href={normalizedHref}
            mediaLabel="audio"
            className="markdown-prose-audio-link-external-action"
          />
        ) : null}
        <audio
          ref={audioRef}
          className="markdown-prose-audio-link-audio"
          preload="metadata"
          src={resolvedSrc}
          onLoadStart={() => {
            setIsLoading(true);
            setLoadError(null);
          }}
          onCanPlay={() => {
            setIsReady(true);
            setIsLoading(false);
          }}
          onPlay={() => {
            setIsPlaying(true);
            setIsLoading(false);
            setLoadError(null);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            setIsReady(false);
            setIsLoading(false);
            setLoadError('audio unavailable');
          }}
        />
      </span>
    );
  };
}
