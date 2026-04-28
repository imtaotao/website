import { type ReactNode } from 'react';

export function ResumeSection(props: {
  title: string;
  children: ReactNode;
  decorated?: boolean;
}) {
  const decorated = props.decorated ?? true;

  return (
    <section data-export-keep-together="true" className="mb-10 md:mb-12">
      {decorated ? (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-300/60" />
          <h2 className="text-xs font-medium tracking-[0.24em] text-zinc-500">
            {props.title}
          </h2>
          <div className="h-px flex-1 bg-zinc-300/60" />
        </div>
      ) : (
        <h2 className="mb-3 text-xs font-medium tracking-[0.24em] text-zinc-500">
          {props.title}
        </h2>
      )}
      {props.children}
    </section>
  );
}
