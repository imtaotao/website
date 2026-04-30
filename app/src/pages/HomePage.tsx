import { type ReactNode } from 'react';
import { Link } from 'react-router';

import '#app/pages/HomePage.css';

type Segment =
  | { type: 'text'; text: string }
  | { type: 'highlight'; text: string }
  | { type: 'resumeLink'; text: string }
  | { type: 'blogLink'; text: string }
  | { type: 'externalLink'; text: string; url: string };

type Block = { type: 'paragraph'; segments: Array<Segment> };

const HOME: {
  name: string;
  blocks: Array<Block>;
} = {
  name: '陈涛',
  blocks: [
    {
      type: 'paragraph',
      segments: [
        {
          type: 'text',
          text: 'Hi 👋，我是陈涛，一名前端工程师，热爱用代码把想法变成交互体验。我的技术栈以 ',
        },
        { type: 'highlight', text: 'React' },
        { type: 'text', text: ' 与 ' },
        { type: 'highlight', text: 'TypeScript' },
        { type: 'text', text: ' 为主，并对' },
        { type: 'highlight', text: '编译' },
        { type: 'text', text: '相关的工作感兴趣。' },
      ],
    },
    {
      type: 'paragraph',
      segments: [
        {
          type: 'text',
          text: '我也喜欢',
        },
        { type: 'highlight', text: '中国古典文化的美学' },
        { type: 'text', text: '、' },
        { type: 'highlight', text: '天文' },
        { type: 'text', text: '和' },
        { type: 'highlight', text: '科幻作品' },
        {
          type: 'text',
          text: '，这些兴趣塑造了我的审美和做事理念。我喜欢在开放且富有热情的团队中工作——那种可以自由讨论、尝试新技术并相互成长的环境能让我发挥得最好。',
        },
      ],
    },
    {
      type: 'paragraph',
      segments: [
        { type: 'text', text: '你可以在我的 ' },
        {
          type: 'externalLink',
          text: 'GitHub',
          url: 'https://github.com/imtaotao',
        },
        { type: 'text', text: ' 上看到我维护的项目，也可以顺路看看我的 ' },
        { type: 'blogLink', text: '博客' },
        { type: 'text', text: '。若想交流合作或招聘机会，' },
        { type: 'resumeLink', text: '这是我的简历' },
        { type: 'text', text: '。' },
      ],
    },
  ],
};

const InkUnderline = (props: { className?: string; children: ReactNode }) => (
  <span className={'home-ink ' + (props.className ?? '')}>
    {props.children}
  </span>
);

const ExternalLink = (props: { href: string; children: ReactNode }) => (
  <a href={props.href} target="_blank" rel="noreferrer" className="home-link">
    <InkUnderline>{props.children}</InkUnderline>
  </a>
);

const renderSegments = (segs: Array<Segment>) => {
  return segs.map((s, idx) => {
    if (s.type === 'text') return <span key={idx}>{s.text}</span>;
    if (s.type === 'highlight') {
      return <InkUnderline key={idx}>{s.text}</InkUnderline>;
    }
    if (s.type === 'externalLink') {
      return (
        <ExternalLink key={idx} href={s.url}>
          {s.text}
        </ExternalLink>
      );
    }
    if (s.type === 'blogLink') {
      return (
        <Link key={idx} to="/blog" className="home-link">
          <InkUnderline>{s.text}</InkUnderline>
        </Link>
      );
    }
    return (
      <Link key={idx} to="/resume" className="home-link">
        <InkUnderline>{s.text}</InkUnderline>
      </Link>
    );
  });
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* 左偏布局：不居中对齐，右侧留白更大 */}
      <div className="home-root w-full px-6 py-14 md:px-14 md:py-24">
        <div className="home-container max-w-185">
          <header className="select-none">
            <h1 className="home-title-font mt-2 text-5xl font-normal tracking-tight text-zinc-900 md:text-6xl">
              {HOME.name}
            </h1>
          </header>

          <div className="home-body-font mt-8 space-y-6 text-[16px] leading-8 text-zinc-800">
            {HOME.blocks.map((b, idx) => (
              <p key={idx}>{renderSegments(b.segments)}</p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
