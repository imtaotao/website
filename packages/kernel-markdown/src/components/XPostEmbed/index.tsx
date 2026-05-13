import { useEffect, useState } from 'react';
import { Tweet } from 'react-twitter-widgets';

import type { XPostEmbedProps } from '#markdown/components/Types';
import '#markdown/components/XPostEmbed/index.css';

function XPostEmbedErrorFallback(props: { onVisible: () => void }) {
  useEffect(() => {
    props.onVisible();
  }, [props]);

  return (
    <div className="markdown-prose-x-post-embed-error">
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

export function MdxXPostEmbed({ url, id, title }: XPostEmbedProps) {
  const source = url?.trim() || id?.trim() || '';
  const tweetId = extractTweetId(source);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.markdown-shell');
    const currentTheme =
      shell?.dataset.markdownTheme === 'dark' ? 'dark' : 'light';
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [tweetId, theme]);

  const ariaLabel = title?.trim() || 'X post';
  if (!tweetId) return null;

  return (
    <article className="markdown-prose-x-post-embed">
      <div className="markdown-prose-x-post-embed-frame-shell">
        <div
          className="markdown-prose-x-post-embed-widget"
          aria-label={ariaLabel}
        >
          {isLoading ? (
            <div className="markdown-prose-x-post-embed-loading">
              <span className="markdown-prose-x-post-embed-loading-lines">
                <span className="markdown-prose-x-post-embed-loading-bar markdown-prose-x-post-embed-loading-bar--long" />
                <span className="markdown-prose-x-post-embed-loading-bar markdown-prose-x-post-embed-loading-bar--medium" />
                <span className="markdown-prose-x-post-embed-loading-bar markdown-prose-x-post-embed-loading-bar--short" />
                <span className="markdown-prose-x-post-embed-loading-bar markdown-prose-x-post-embed-loading-bar--long" />
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
