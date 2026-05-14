import { isValidElement, type ReactNode } from 'react';
import { isArray, isNil, isString } from 'aidly';

type MediaElementType = {
  __markdownMediaElement?: boolean;
};

const toNodeArray = (children: ReactNode) => {
  const list = isArray(children) ? children : [children];
  return list.filter((item) => {
    if (isNil(item) || typeof item === 'boolean') return false;
    if (isString(item)) return item.trim().length > 0;
    return true;
  });
};

export function isMediaOnlyParagraph(children: ReactNode) {
  const nodes = toNodeArray(children);
  if (nodes.length !== 1) return false;
  const node = nodes[0];
  if (!isValidElement(node)) return false;
  if (node.type === 'img') return true;
  return Boolean((node.type as MediaElementType).__markdownMediaElement);
}
