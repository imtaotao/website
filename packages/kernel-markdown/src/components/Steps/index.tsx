import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { StepProps, StepsProps } from '#markdown/components/Types';
import '#markdown/components/Steps/index.css';

export function MdxSteps(props: StepsProps) {
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
        'markdown-steps-block',
        `markdown-steps-block--${direction}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {title ? <div className="markdown-steps-block-title">{title}</div> : null}
      <ol className="markdown-steps-list">{stepChildren}</ol>
    </section>
  );
}

export function MdxStep(props: StepProps) {
  const { title, markerColor, markerTextColor, children, className } = props;
  const lines = Array.isArray(children) ? children : [children];
  const content = lines.filter(
    (line): line is Exclude<ReactNode, boolean | null | undefined> =>
      line !== undefined && line !== null && line !== false,
  );
  const style = createMarkerStyle(markerColor, markerTextColor);

  return (
    <li
      className={['markdown-step', className].filter(Boolean).join(' ')}
      style={style}
    >
      {title ? <div className="markdown-step-title">{title}</div> : null}
      <div className="markdown-step-body">
        {content.map((line, index) => (
          <div key={`step-line-${index}`} className="markdown-step-line">
            {line}
          </div>
        ))}
      </div>
    </li>
  );
}

type MarkerStyle = CSSProperties & {
  '--markdown-step-marker-bg'?: string;
  '--markdown-step-marker-color'?: string;
};

function createMarkerStyle(
  markerColor?: string,
  markerTextColor?: string,
): MarkerStyle | undefined {
  if (!markerColor && !markerTextColor) return undefined;

  return {
    '--markdown-step-marker-bg': markerColor,
    '--markdown-step-marker-color': markerTextColor,
  };
}

type HeadingComponent = {
  mdxHeadingTag?: string;
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
    <MdxStep key={`auto-step-${index}`} title={group.title}>
      {group.content}
    </MdxStep>
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

function isStepElement(node: ReactNode): node is ReactElement<StepProps> {
  return isValidElement(node) && node.type === MdxStep;
}

function isHeadingElement(node: ReactNode): node is HeadingElement {
  if (!isValidElement(node)) return false;

  if (typeof node.type === 'string') {
    return /^h[1-6]$/.test(node.type);
  }

  if (typeof node.type !== 'function') return false;

  return Boolean((node.type as HeadingComponent).mdxHeadingTag);
}
