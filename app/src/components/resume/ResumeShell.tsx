import { type ReactNode } from 'react';

export function ResumeShell(props: {
  children: ReactNode;
  topBar?: ReactNode;
}) {
  return (
    <div
      className="resume-root min-h-screen text-zinc-900"
      // 用 inline style 避免 Tailwind 扫描不到复杂的 bg-[...] 导致背景丢失。
      style={{
        backgroundColor: '#ffffff',
        backgroundImage:
          // white base + very soft blue/purple glows (iOS/Notion-like)
          'radial-gradient(900px circle at 18% 8%, rgba(191,219,254,0.45) 0%, rgba(255,255,255,0) 62%),' +
          'radial-gradient(860px circle at 86% 14%, rgba(216,180,254,0.38) 0%, rgba(255,255,255,0) 60%),' +
          'radial-gradient(820px circle at 52% 108%, rgba(167,243,208,0.22) 0%, rgba(255,255,255,0) 58%),' +
          'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,255,1) 100%)',
      }}
    >
      {props.topBar ? (
        <div
          data-export-hide="true"
          className="fixed right-3 top-3 z-50 md:right-5 md:top-4"
        >
          {props.topBar}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-240 px-0 py-0 md:px-6 md:py-7">
        <div
          className={
            'mx-auto w-full max-w-198.5 rounded-none border-0 bg-white px-5 py-6 shadow-md shadow-zinc-200/60 ' +
            'md:rounded-md md:border-0 md:px-8 md:py-7'
          }
        >
          {props.children}
        </div>
      </div>
    </div>
  );
}
