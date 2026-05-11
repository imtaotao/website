import {
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import '#blog/components/MarkdownAudioEmbed.css';
import type {
  AudioEmbedProps,
  MarkdownMediaContext,
} from '#blog/components/MarkdownMediaShared';

export function createAudioEmbed(context: MarkdownMediaContext) {
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainSeconds = totalSeconds % 60;

    return `${minutes}:${String(remainSeconds).padStart(2, '0')}`;
  };

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

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(Boolean(hasInlinePlayer));
    const [loadError, setLoadError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const progressValue =
      durationSeconds > 0 ? currentTime / durationSeconds : 0;
    const durationLabel = useMemo(() => {
      if (durationSeconds > 0) return formatTime(durationSeconds);
      return duration?.trim() || '0:00';
    }, [duration, durationSeconds]);
    const statusLabel = loadError
      ? loadError
      : isLoading || !isReady
      ? 'loading audio'
      : null;

    useEffect(() => {
      setIsPlaying(false);
      setIsReady(false);
      setIsLoading(Boolean(hasInlinePlayer));
      setLoadError(null);
      setCurrentTime(0);
      setDurationSeconds(0);
    }, [hasInlinePlayer, resolvedSrc]);

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
          <div className="blog-prose-audio-embed-player">
            <button
              type="button"
              className={`blog-prose-audio-embed-toggle${
                isPlaying ? ' blog-prose-audio-embed-toggle--playing' : ''
              }${isLoading ? ' blog-prose-audio-embed-toggle--loading' : ''}${
                loadError ? ' blog-prose-audio-embed-toggle--error' : ''
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
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              disabled={Boolean(loadError)}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="blog-prose-audio-embed-timeline">
              <div className="blog-prose-audio-embed-scrubber">
                <div
                  className="blog-prose-audio-embed-progress"
                  style={
                    {
                      ['--blog-audio-progress' as string]: `${
                        progressValue * 100
                      }%`,
                    } as CSSProperties
                  }
                >
                  <input
                    type="range"
                    min={0}
                    max={durationSeconds || 0}
                    step={0.1}
                    value={Math.min(
                      currentTime,
                      durationSeconds || currentTime,
                    )}
                    onChange={(event) => {
                      const nextTime = Number(event.target.value);
                      setCurrentTime(nextTime);
                      if (audioRef.current) {
                        audioRef.current.currentTime = nextTime;
                      }
                    }}
                    aria-label="Seek audio"
                    disabled={durationSeconds <= 0}
                  />
                </div>
                <div className="blog-prose-audio-embed-time">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
              {statusLabel ? (
                <div className="blog-prose-audio-embed-meta">
                  <span className="blog-prose-audio-embed-status">
                    {statusLabel}
                  </span>
                </div>
              ) : null}
            </div>
            <audio
              ref={audioRef}
              className="blog-prose-audio-embed-native"
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
              onLoadedMetadata={(event) => {
                const nextDuration = event.currentTarget.duration;
                if (Number.isFinite(nextDuration)) {
                  setDurationSeconds(nextDuration);
                }
              }}
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime);
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsLoading(false);
                setLoadError(null);
              }}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setIsPlaying(false);
                setIsReady(false);
                setIsLoading(false);
                setLoadError('audio unavailable');
              }}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
            />
          </div>
        </div>
      </article>
    );
  };
}
