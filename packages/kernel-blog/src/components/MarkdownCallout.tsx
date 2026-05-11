import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

import '#blog/components/MarkdownCallout.css';
import type {
  BlogCalloutProps,
  BlogCalloutTone,
} from '#blog/components/MarkdownTypes';

const calloutTitleMap: Record<BlogCalloutTone, string> = {
  note: '说明',
  tip: '提示',
  warning: '注意',
  success: '完成',
};

const calloutIconMap: Record<BlogCalloutTone, ReactNode> = {
  note: <InfoCircledIcon aria-hidden="true" />,
  tip: <LightningBoltIcon aria-hidden="true" />,
  warning: <ExclamationTriangleIcon aria-hidden="true" />,
  success: <CheckCircledIcon aria-hidden="true" />,
};

export function BlogMdxCallout(props: BlogCalloutProps) {
  const { tone = 'note', title, icon, className, children } = props;

  return (
    <aside
      className={['blog-callout', `blog-callout--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="blog-callout-header">
        <span className="blog-callout-icon">
          {icon ?? calloutIconMap[tone]}
        </span>
        <strong className="blog-callout-title">
          {title ?? calloutTitleMap[tone]}
        </strong>
      </div>
      <div className="blog-callout-body">{children}</div>
    </aside>
  );
}
