import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import '#blog/components/MarkdownSteps/Steps.css';
import type {
  BlogStepProps,
  BlogStepsProps,
} from '#blog/components/MarkdownTypes';

export function BlogMdxSteps(props: BlogStepsProps) {
  const {
    title,
    direction = 'vertical',
    markerColor,
    markerTextColor,
    className,
    children,
  } = props;
  const style = createMarkerStyle(markerColor, markerTextColor);
  const stepChildren = createStepChildren(children);

  return (
    <section
      className={[
        'blog-steps-block',
        `blog-steps-block--${direction}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {title ? <div className="blog-steps-block-title">{title}</div> : null}
      <ol className="blog-steps-list">{stepChildren}</ol>
    </section>
  );
}

export function BlogMdxStep(props: BlogStepProps) {
  const { title, markerColor, markerTextColor, children, className } = props;
  const lines = Array.isArray(children) ? children : [children];
  const content = lines.filter(
    (line): line is Exclude<ReactNode, boolean | null | undefined> =>
      line !== undefined && line !== null && line !== false,
  );
  const style = createMarkerStyle(markerColor, markerTextColor);

  return (
    <li
      className={['blog-step', className].filter(Boolean).join(' ')}
      style={style}
    >
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

type MarkerStyle = CSSProperties & {
  '--blog-step-marker-bg'?: string;
  '--blog-step-marker-color'?: string;
};

function createMarkerStyle(
  markerColor?: string,
  markerTextColor?: string,
): MarkerStyle | undefined {
  if (!markerColor && !markerTextColor) return undefined;

  return {
    '--blog-step-marker-bg': markerColor,
    '--blog-step-marker-color': markerTextColor,
  };
}

type HeadingComponent = {
  blogMdxHeadingTag?: string;
};

type HeadingElement = ReactElement<{
  children?: ReactNode;
}>;

type AutoStepGroup = {
  title?: ReactNode;
  content: Array<ReactNode>;
};

function createStepChildren(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children).filter((node) => {
    if (typeof node !== 'string') return true;
    return node.trim().length > 0;
  });

  if (!nodes.length || nodes.some(isStepElement)) return children;

  const groups = createAutoStepGroups(nodes);
  if (!groups) return children;

  return groups.map((group, index) => (
    <BlogMdxStep key={`auto-step-${index}`} title={group.title}>
      {group.content}
    </BlogMdxStep>
  ));
}

function createAutoStepGroups(
  nodes: Array<ReactNode>,
): Array<AutoStepGroup> | undefined {
  const groups: Array<AutoStepGroup> = [];
  let currentGroup: AutoStepGroup | undefined;
  let hasHeading = false;

  for (const node of nodes) {
    if (isHeadingElement(node)) {
      hasHeading = true;
      currentGroup = {
        title: node.props.children,
        content: [],
      };
      groups.push(currentGroup);
      continue;
    }

    if (!currentGroup) {
      currentGroup = { content: [] };
      groups.push(currentGroup);
    }

    currentGroup.content.push(node);
  }

  return hasHeading ? groups : undefined;
}

function isStepElement(node: ReactNode): node is ReactElement<BlogStepProps> {
  return isValidElement(node) && node.type === BlogMdxStep;
}

function isHeadingElement(node: ReactNode): node is HeadingElement {
  if (!isValidElement(node)) return false;

  if (typeof node.type === 'string') {
    return /^h[1-6]$/.test(node.type);
  }

  if (typeof node.type !== 'function') return false;

  return Boolean((node.type as HeadingComponent).blogMdxHeadingTag);
}
