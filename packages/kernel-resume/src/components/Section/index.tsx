import { type ReactNode } from 'react';
import { SectionHeader } from 'willa';

export function Section(props: {
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
      <SectionHeader
        size="sm"
        variant={decorated ? 'centered-line' : 'default'}
        className={decorated ? 'mb-5' : 'mb-3'}
        title={<span className="resume-section-title">{props.title}</span>}
      />
      {props.children}
    </section>
  );
}
