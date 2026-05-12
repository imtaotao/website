import { useEffect, useState } from 'react';
import { Tweet } from 'react-twitter-widgets';

import '#blog/components/MarkdownXPostEmbed/XPostEmbed.css';
import type { BlogXPostEmbedProps } from '#blog/components/MarkdownTypes';

function XPostEmbedErrorFallback(props: { onVisible: () => void }) {
  useEffect(() => {
    props.onVisible();
  }, [props]);

  return (
    <div className="blog-prose-x-post-embed-error">
      Failed to load this X post.
    </div>
  );
}

function extractTweetId(urlOrId: string) {
  const value = urlOrId.trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) return value;

  const match = value.match(/status\/(\d+)/i);
  return match?.[1] || '';
}

export function BlogMdxXPostEmbed({ url, id, title }: BlogXPostEmbedProps) {
  const source = url?.trim() || id?.trim() || '';
  const tweetId = extractTweetId(source);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.blog-shell');
    const currentTheme = shell?.dataset.blogTheme === 'dark' ? 'dark' : 'light';
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [tweetId, theme]);

  const ariaLabel = title?.trim() || 'X post';
  if (!tweetId) return null;

  return (
    <article className="blog-prose-x-post-embed">
      <div className="blog-prose-x-post-embed-frame-shell">
        <div className="blog-prose-x-post-embed-widget" aria-label={ariaLabel}>
          {isLoading ? (
            <div className="blog-prose-x-post-embed-loading">
              <span className="blog-prose-x-post-embed-loading-lines">
                <span className="blog-prose-x-post-embed-loading-bar blog-prose-x-post-embed-loading-bar--long" />
                <span className="blog-prose-x-post-embed-loading-bar blog-prose-x-post-embed-loading-bar--medium" />
                <span className="blog-prose-x-post-embed-loading-bar blog-prose-x-post-embed-loading-bar--short" />
                <span className="blog-prose-x-post-embed-loading-bar blog-prose-x-post-embed-loading-bar--long" />
              </span>
            </div>
          ) : null}
          <Tweet
            key={`${tweetId}-${theme}`}
            tweetId={tweetId}
            options={{ theme }}
            onLoad={() => {
              setIsLoading(false);
            }}
            renderError={() => (
              <XPostEmbedErrorFallback
                onVisible={() => {
                  setIsLoading(false);
                }}
              />
            )}
          />
        </div>
      </div>
    </article>
  );
}
