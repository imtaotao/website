import {
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';

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
    const statusLabel = loadError
      ? 'audio unavailable'
      : isLoading
      ? 'loading'
      : !isReady
      ? 'loading'
      : null;

    return (
      <span className="blog-prose-audio-link-wrap">
        <button
          type="button"
          className={`blog-prose-audio-link blog-prose-audio-link--player${
            isPlaying ? ' blog-prose-audio-link--playing' : ''
          }${isLoading ? ' blog-prose-audio-link--loading' : ''}${
            loadError ? ' blog-prose-audio-link--error' : ''
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
            className="blog-prose-audio-link-trigger"
            aria-hidden="true"
            data-state={isPlaying ? 'playing' : 'idle'}
          >
            <PlayIcon className="blog-prose-audio-link-icon blog-prose-audio-link-icon--trigger blog-prose-audio-link-icon--play" />
            <PauseIcon className="blog-prose-audio-link-icon blog-prose-audio-link-icon--trigger blog-prose-audio-link-icon--pause" />
          </span>
          {content}
          <span
            className="blog-prose-audio-link-status"
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
            className="blog-prose-audio-link-external-action"
          />
        ) : null}
        <audio
          ref={audioRef}
          className="blog-prose-audio-link-audio"
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
