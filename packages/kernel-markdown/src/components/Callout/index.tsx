import type { ReactNode } from 'react';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons';

import type { CalloutProps, CalloutTone } from '#markdown/components/Types';
import '#markdown/components/Callout/index.css';

const toneTitleMap: Record<CalloutTone, string> = {
  note: '说明',
  tip: '提示',
  warning: '注意',
  success: '完成',
  error: '错误',
};

const toneIconMap: Record<CalloutTone, ReactNode> = {
  note: <InfoCircledIcon />,
  tip: <LightningBoltIcon />,
  warning: <ExclamationTriangleIcon />,
  success: <CheckCircledIcon />,
  error: <CrossCircledIcon />,
};

export function MdxCallout(props: CalloutProps) {
  const { tone = 'note', title, icon, className, children } = props;
  const resolvedTitle = title ?? toneTitleMap[tone];
  const resolvedIcon = icon ?? toneIconMap[tone];

  return (
    <aside
      className={['markdown-callout', `markdown-callout--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="markdown-callout-header">
        <span className="markdown-callout-icon">{resolvedIcon}</span>
        {resolvedTitle ? (
          <div className="markdown-callout-title">{resolvedTitle}</div>
        ) : null}
      </div>
      <div className="markdown-callout-body">{children}</div>
    </aside>
  );
}
