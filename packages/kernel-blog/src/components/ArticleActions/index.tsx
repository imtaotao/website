import { ArrowUpIcon, CaretUpIcon } from '@radix-ui/react-icons';
import type { SVGProps } from 'react';

export type ArticleActionsProps = {
  showBackToTop: boolean;
  shouldEnableBgm: boolean;
  isBgmReady: boolean;
  isBgmPlaying: boolean;
  hasBgmError: boolean;
  backToTopLabel: string;
  onBackToTop: () => void;
  onToggleBgm: () => void | Promise<void>;
};

const BlogBgmSpeakerIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 6.1H4.9L7.85 3.8V11.2L4.9 8.9H2.5V6.1Z"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 5.4C10.77 5.95 11.1 6.65 11.1 7.5C11.1 8.35 10.77 9.05 10.15 9.6"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export function ArticleActions(props: ArticleActionsProps) {
  const bgmLabel = props.hasBgmError
    ? '背景音乐加载失败，点击重试'
    : props.isBgmPlaying
    ? '暂停背景音乐'
    : '播放背景音乐';
  const bgmTitle = props.hasBgmError
    ? '背景音乐加载失败，点击重试'
    : props.isBgmPlaying
    ? '暂停背景音乐'
    : props.isBgmReady
    ? '播放背景音乐'
    : '背景音乐加载中';

  return (
    <div className="blog-article-actions" aria-label={props.backToTopLabel}>
      <button
        type="button"
        className={`blog-article-action blog-back-to-top${
          props.showBackToTop ? ' blog-back-to-top--visible' : ''
        }`}
        onClick={props.onBackToTop}
        aria-label={props.backToTopLabel}
        title={props.backToTopLabel}
        aria-hidden={!props.showBackToTop}
        tabIndex={props.showBackToTop ? 0 : -1}
      >
        <ArrowUpIcon className="blog-back-to-top-icon blog-back-to-top-icon--desktop" />
        <CaretUpIcon className="blog-back-to-top-icon blog-back-to-top-icon--mobile" />
      </button>

      {props.shouldEnableBgm ? (
        <button
          type="button"
          className={`blog-article-action blog-bgm-toggle${
            props.isBgmPlaying ? ' blog-bgm-toggle--playing' : ''
          }${props.hasBgmError ? ' blog-bgm-toggle--error' : ''}${
            !props.isBgmReady ? ' blog-bgm-toggle--loading' : ''
          }`}
          onClick={() => {
            void props.onToggleBgm();
          }}
          aria-label={bgmLabel}
          title={bgmTitle}
        >
          <span
            className={`blog-bgm-icon-wrap${
              props.isBgmPlaying ? ' blog-bgm-icon-wrap--hidden' : ''
            }`}
            aria-hidden="true"
          >
            <BlogBgmSpeakerIcon className="blog-article-action-icon" />
          </span>
          <span className="blog-bgm-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      ) : null}
    </div>
  );
}
