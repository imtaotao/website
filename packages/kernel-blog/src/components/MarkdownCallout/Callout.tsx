import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

import '#blog/components/MarkdownCallout/Callout.css';
import type {
  BlogCalloutProps,
  BlogCalloutTone,
} from '#blog/components/MarkdownTypes';

const toneTitleMap: Record<BlogCalloutTone, string> = {
  note: '说明',
  tip: '提示',
  warning: '注意',
  success: '完成',
  error: '错误',
};

const toneIconMap: Record<BlogCalloutTone, ReactNode> = {
  note: <InfoCircledIcon />,
  tip: <LightningBoltIcon />,
  warning: <ExclamationTriangleIcon />,
  success: <CheckCircledIcon />,
  error: <CrossCircledIcon />,
};

export function BlogMdxCallout(props: BlogCalloutProps) {
  const { tone = 'note', title, icon, className, children } = props;
  const resolvedTitle = title ?? toneTitleMap[tone];
  const resolvedIcon = icon ?? toneIconMap[tone];

  return (
    <aside
      className={['blog-callout', `blog-callout--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="blog-callout-header">
        <span className="blog-callout-icon">{resolvedIcon}</span>
        {resolvedTitle ? (
          <div className="blog-callout-title">{resolvedTitle}</div>
        ) : null}
      </div>
      <div className="blog-callout-body">{children}</div>
    </aside>
  );
}
