import type { MarkdownHeading } from '#blog/components/MarkdownTypes';

export const flattenText = (node: unknown): string => {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (typeof node === 'object' && 'props' in (node as any)) {
    return flattenText((node as any).props?.children);
  }
  return '';
};

const toHeadingSlug = (value: string) => {
  const normalized = value
    .trim()
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => {
      const match = /^\[([^\]]*)\]/.exec(m);
      return match?.[1] ?? '';
    })
    .replace(/`+/g, '')
    .replace(/[*_~]/g, '')
    .replace(/<[^>]+>/g, '');

  return normalized
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const createHeadingIdFactory = () => {
  const counts = new Map<string, number>();

  return (text: string) => {
    const base = toHeadingSlug(text) || 'section';
    const next = (counts.get(base) ?? 0) + 1;
    counts.set(base, next);
    return next === 1 ? base : `${base}-${next}`;
  };
};

export const extractMarkdownHeadings = (
  source: string,
): Array<MarkdownHeading> => {
  const nextId = createHeadingIdFactory();
  const headings: Array<MarkdownHeading> = [];
  const lines = source.split(/\r?\n/);

  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const raw = match[2].replace(/\s+#+\s*$/, '').trim();
    if (!raw) continue;

    headings.push({ level, text: raw, id: nextId(raw) });
  }

  return headings;
};
