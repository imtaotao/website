import { type ReactNode } from 'react';
import { Separator } from 'willa';

export function ResumeSection(props: {
  title: string;
  children: ReactNode;
  decorated?: boolean;
  pageBreakBefore?: boolean;
}) {
  const decorated = props.decorated ?? true;

  return (
    <section
      data-export-keep-together="true"
      data-export-page-break={props.pageBreakBefore ? 'before' : undefined}
      className="mb-7 md:mb-9"
    >
      {decorated ? (
        <div className="mb-5 flex items-center gap-3">
          <Separator size="sm" className="resume-section-separator" />
          <h2 className="text-xs font-medium tracking-[0.24em] text-zinc-500">
            {props.title}
          </h2>
          <Separator size="sm" className="resume-section-separator" />
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
