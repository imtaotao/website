import type { SVGProps } from 'react';
import { FloatButton } from 'willa';

export type ArticleFloatingActionsProps = {
  backToTopLabel: string;
  enableBgm: boolean;
  isBgmReady: boolean;
  isBgmPlaying: boolean;
  hasBgmError: boolean;
  onToggleBgm: () => void | Promise<void>;
};

const BlogBackToTopIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 11.45V3.8"
        stroke="var(--blog-back-to-top-icon-color)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.2 7.1L7.5 3.8L10.8 7.1"
        stroke="var(--blog-back-to-top-icon-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BlogBgmSpeakerIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 6.1H4.9L7.85 3.8V11.2L4.9 8.9H2.5V6.1Z"
        stroke="var(--blog-article-action-solid-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 5.4C10.77 5.95 11.1 6.65 11.1 7.5C11.1 8.35 10.77 9.05 10.15 9.6"
        stroke="var(--blog-article-action-solid-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BlogBgmToggleIcon = (props: { isPlaying: boolean }) => {
  return (
    <>
      <span
        className={`blog-bgm-icon-wrap${
          props.isPlaying ? ' blog-bgm-icon-wrap--hidden' : ''
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
    </>
  );
};

const getBgmLabel = (props: ArticleFloatingActionsProps) => {
  if (props.hasBgmError) return '背景音乐加载失败，点击重试';
  if (props.isBgmPlaying) return '暂停背景音乐';
  if (props.isBgmReady) return '播放背景音乐';
  return '背景音乐加载中';
};

export function ArticleFloatingActions(props: ArticleFloatingActionsProps) {
  const bgmLabel = getBgmLabel(props);

  return (
    <>
      <FloatButton
        backToTop
        ariaLabel={props.backToTopLabel}
        tooltip={props.backToTopLabel}
        variant="ghost"
        shape="circle"
        size="md"
        offset={[24, 24]}
        backgroundColor="transparent"
        hoverBackgroundColor="transparent"
        textColor="var(--blog-article-action-color)"
        hoverTextColor="var(--blog-article-action-hover-color)"
        className="blog-article-action blog-back-to-top"
        icon={<BlogBackToTopIcon className="blog-article-action-icon" />}
      />

      {props.enableBgm ? (
        <FloatButton
          type="button"
          ariaLabel={bgmLabel}
          tooltip={bgmLabel}
          variant="ghost"
          shape="circle"
          size="md"
          offset={[24, 88]}
          backgroundColor="transparent"
          hoverBackgroundColor="transparent"
          textColor="var(--blog-article-action-color)"
          hoverTextColor="var(--blog-article-action-hover-color)"
          className={`blog-article-action blog-bgm-toggle${
            props.isBgmPlaying ? ' blog-bgm-toggle--playing' : ''
          }${props.hasBgmError ? ' blog-bgm-toggle--error' : ''}${
            !props.isBgmReady ? ' blog-bgm-toggle--loading' : ''
          }`}
          contentClassName="blog-bgm-toggle-content"
          icon={<BlogBgmToggleIcon isPlaying={props.isBgmPlaying} />}
          onClick={() => props.onToggleBgm()}
        />
      ) : null}
    </>
  );
}
