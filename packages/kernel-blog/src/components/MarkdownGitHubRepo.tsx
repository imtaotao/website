import { ExclamationTriangleIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { useEffect, useRef, useState } from 'react';

import '#blog/components/MarkdownGitHubRepo.css';
import type { BlogGitHubRepoProps } from '#blog/components/MarkdownTypes';

type GitHubRepoResponse = {
  description?: string | null;
  full_name?: string;
  html_url?: string;
  language?: string | null;
  owner?: {
    avatar_url?: string;
    login?: string;
  };
  stargazers_count?: number;
};

const githubRepoCache = new Map<string, GitHubRepoResponse>();

export function BlogMdxGitHubRepo({
  repo,
  label,
  href,
  description,
  language,
  stars,
  owner,
  ownerAvatarUrl,
}: BlogGitHubRepoProps) {
  const normalizedRepo = repo.trim().replace(/^\/+|\/+$/g, '');

  if (!normalizedRepo) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [remoteData, setRemoteData] = useState<GitHubRepoResponse | null>(null);
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

    const cached = githubRepoCache.get(normalizedRepo);
    if (cached) {
      setRemoteData(cached);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(false);

    fetch(`https://api.github.com/repos/${normalizedRepo}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub repo ${response.status}`);
        const data = (await response.json()) as GitHubRepoResponse;
        githubRepoCache.set(normalizedRepo, data);
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
  }, [isOpen, loadError, normalizedRepo, remoteData]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const repositoryUrl =
    href?.trim() ||
    remoteData?.html_url?.trim() ||
    `https://github.com/${normalizedRepo}`;
  const displayLabel =
    label?.trim() || remoteData?.full_name?.trim() || normalizedRepo;
  const [repoOwner] = normalizedRepo.split('/');
  const displayOwner =
    owner?.trim() || remoteData?.owner?.login?.trim() || repoOwner;
  const repoAvatar =
    ownerAvatarUrl?.trim() ||
    remoteData?.owner?.avatar_url?.trim() ||
    (repoOwner ? `https://github.com/${repoOwner}.png?size=80` : '');
  const detailItems = [
    language?.trim() || remoteData?.language?.trim() || null,
    (stars ?? remoteData?.stargazers_count) != null
      ? `${stars ?? remoteData?.stargazers_count} stars`
      : null,
  ].filter(Boolean) as string[];
  const displayDescription =
    description?.trim() || remoteData?.description?.trim() || '';

  return (
    <span
      className="blog-prose-github-repo-wrap"
      data-open={isOpen ? 'true' : 'false'}
      onFocus={openCard}
      onBlur={scheduleClose}
    >
      <a
        className="blog-prose-github-repo"
        href={repositoryUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open GitHub repository: ${normalizedRepo}`}
        onPointerEnter={openCard}
        onPointerLeave={scheduleClose}
      >
        <GitHubLogoIcon className="blog-prose-github-repo-icon" />
        <span className="blog-prose-github-repo-name">{displayLabel}</span>
      </a>
      <span
        className="blog-prose-github-hover-card blog-prose-github-hover-card--repo"
        onPointerEnter={openCard}
        onPointerLeave={closeCard}
      >
        <span className="blog-prose-github-hover-card-head">
          {repoAvatar ? (
            <img
              className="blog-prose-github-hover-card-avatar"
              src={repoAvatar}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="blog-prose-github-hover-card-avatar blog-prose-github-hover-card-avatar--fallback">
              <GitHubLogoIcon />
            </span>
          )}
          <span className="blog-prose-github-hover-card-copy">
            <span className="blog-prose-github-hover-card-title">
              {displayLabel}
            </span>
            <span className="blog-prose-github-hover-card-subtitle">
              {displayOwner}
            </span>
          </span>
        </span>
        {isLoading ? (
          <span className="blog-prose-github-hover-card-loading">
            Loading GitHub repository...
          </span>
        ) : loadError ? (
          <span className="blog-prose-github-hover-card-error">
            <ExclamationTriangleIcon />
            <span>Failed to load GitHub repository.</span>
          </span>
        ) : displayDescription ? (
          <span className="blog-prose-github-hover-card-description">
            {displayDescription}
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
