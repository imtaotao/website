import type { ReactNode } from 'react';

import '#blog/components/MarkdownSteps.css';
import type {
  BlogStepProps,
  BlogStepsProps,
} from '#blog/components/MarkdownTypes';

export function BlogMdxSteps(props: BlogStepsProps) {
  const { title, className, children } = props;

  return (
    <section
      className={['blog-steps-block', className].filter(Boolean).join(' ')}
    >
      {title ? <div className="blog-steps-block-title">{title}</div> : null}
      <ol className="blog-steps-list">{children}</ol>
    </section>
  );
}

export function BlogMdxStep(props: BlogStepProps) {
  const { title, children, className } = props;
  const lines = Array.isArray(children) ? children : [children];
  const content = lines.filter(
    (line): line is Exclude<ReactNode, boolean | null | undefined> =>
      line !== undefined && line !== null && line !== false,
  );

  return (
    <li className={['blog-step', className].filter(Boolean).join(' ')}>
      {title ? <div className="blog-step-title">{title}</div> : null}
      <div className="blog-step-body">
        {content.map((line, index) => (
          <div key={`step-line-${index}`} className="blog-step-line">
            {line}
          </div>
        ))}
      </div>
    </li>
  );
}
