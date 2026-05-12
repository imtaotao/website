import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';

import '#blog/components/MarkdownGitHubMention/GitHubMention.css';
import type { BlogGitHubMentionProps } from '#blog/components/MarkdownTypes';

type GitHubUserResponse = {
  avatar_url?: string;
  bio?: string | null;
  followers?: number;
  html_url?: string;
  login?: string;
  name?: string | null;
  public_repos?: number;
};

const githubUserCache = new Map<string, GitHubUserResponse>();

export function BlogMdxGitHubMention({
  username,
  name,
  href,
  avatarUrl,
  bio,
  followers,
  repositories,
}: BlogGitHubMentionProps) {
  const normalizedUsername = username.trim().replace(/^@+/, '');

  if (!normalizedUsername) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [remoteData, setRemoteData] = useState<GitHubUserResponse | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current == null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openCard = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const closeCard = () => {
    clearCloseTimer();
    setIsOpen(false);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 300);
  };

  useEffect(() => {
    if (!isOpen || remoteData || loadError) return;

    const cached = githubUserCache.get(normalizedUsername);
    if (cached) {
      setRemoteData(cached);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(false);

    fetch(`https://api.github.com/users/${normalizedUsername}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub user ${response.status}`);
        const data = (await response.json()) as GitHubUserResponse;
        githubUserCache.set(normalizedUsername, data);
        setRemoteData(data);
        setLoadError(false);
      })
      .catch((error: unknown) => {
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'AbortError'
        ) {
          return;
        }

        setLoadError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, loadError, normalizedUsername, remoteData]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const profileUrl =
    href?.trim() ||
    remoteData?.html_url?.trim() ||
    `https://github.com/${normalizedUsername}`;
  const profileAvatar =
    avatarUrl?.trim() ||
    remoteData?.avatar_url?.trim() ||
    `https://github.com/${normalizedUsername}.png?size=80`;
  const displayName =
    name?.trim() || remoteData?.name?.trim() || normalizedUsername;
  const displayHandle = remoteData?.login?.trim() || normalizedUsername;
  const displayBio = bio?.trim() || remoteData?.bio?.trim() || '';
  const displayFollowers = followers ?? remoteData?.followers ?? null;
  const displayRepositories = repositories ?? remoteData?.public_repos ?? null;
  const detailItems = [
    displayFollowers != null ? `${displayFollowers} followers` : null,
    displayRepositories != null ? `${displayRepositories} repositories` : null,
  ].filter(Boolean) as string[];

  return (
    <span
      className="blog-prose-github-mention-wrap"
      data-open={isOpen ? 'true' : 'false'}
      onFocus={openCard}
      onBlur={scheduleClose}
    >
      <a
        className="blog-prose-github-mention"
        href={profileUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open GitHub profile: ${normalizedUsername}`}
        onPointerEnter={openCard}
        onPointerLeave={scheduleClose}
      >
        <img
          className="blog-prose-github-mention-avatar"
          src={profileAvatar}
          alt=""
          loading="lazy"
        />
        <span className="blog-prose-github-mention-copy">
          <span className="blog-prose-github-mention-name">
            <span>{displayName}</span>
          </span>
        </span>
      </a>
      <span
        className="blog-prose-github-hover-card blog-prose-github-hover-card--mention"
        onPointerEnter={openCard}
        onPointerLeave={closeCard}
      >
        <span className="blog-prose-github-hover-card-head">
          <img
            className="blog-prose-github-hover-card-avatar"
            src={profileAvatar}
            alt=""
            loading="lazy"
          />
          <span className="blog-prose-github-hover-card-copy">
            <span className="blog-prose-github-hover-card-title">
              {displayName}
            </span>
            <span className="blog-prose-github-hover-card-subtitle">
              @{displayHandle}
            </span>
          </span>
        </span>
        {isLoading ? (
          <span className="blog-prose-github-hover-card-loading">
            Loading GitHub profile...
          </span>
        ) : loadError ? (
          <span className="blog-prose-github-hover-card-error">
            <ExclamationTriangleIcon />
            <span>Failed to load GitHub profile.</span>
          </span>
        ) : displayBio ? (
          <span className="blog-prose-github-hover-card-description">
            {displayBio}
          </span>
        ) : null}
        {!isLoading && !loadError && detailItems.length ? (
          <span className="blog-prose-github-hover-card-meta">
            {detailItems.map((item) => (
              <span
                key={item}
                className="blog-prose-github-hover-card-meta-item"
              >
                {item}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}
