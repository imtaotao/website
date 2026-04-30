import type { ComponentProps, ComponentType } from 'react';
import { MDXProvider } from '@mdx-js/react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

export type MarkdownHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

const getCodeLanguage = (className?: string) => {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match?.[1] ?? 'text';
};

const normalizeHljsLanguage = (language: string) => {
  const key = language.toLowerCase();
  const aliasMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    md: 'markdown',
  };
  return aliasMap[key] ?? key;
};

const flattenText = (node: unknown): string => {
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

const createHeadingIdFactory = () => {
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

    const id = nextId(raw);
    headings.push({ level, text: raw, id });
  }

  return headings;
};

const highlightCodeToHtml = (code: string, rawLanguage: string) => {
  const language = normalizeHljsLanguage(rawLanguage);

  if (hljs.getLanguage(language)) {
    return {
      html: hljs.highlight(code, { language }).value,
      display: rawLanguage,
    };
  }

  const result = hljs.highlightAuto(code);
  return {
    html: result.value,
    display: result.language ?? rawLanguage,
  };
};

const BlogMdxPre = (props: ComponentProps<'pre'> & { children?: unknown }) => {
  const child = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  if (child && typeof child === 'object' && 'props' in (child as any)) {
    const codeProps = (child as any).props as {
      className?: string;
      children?: unknown;
    };
    const rawLanguage = getCodeLanguage(codeProps.className);
    const code = String(codeProps.children ?? '').replace(/\n$/, '');
    const { html, display } = highlightCodeToHtml(code, rawLanguage);
    const label = (display || rawLanguage || 'text').toUpperCase();

    return (
      <div className="blog-prose-pre">
        <div className="blog-prose-code-block">
          <div className="blog-prose-code-meta" aria-hidden="true">
            <span className="blog-prose-code-lang">{label}</span>
          </div>
          <code
            className={`blog-prose-code hljs language-${rawLanguage}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    );
  }

  return <div className="blog-prose-pre">{props.children}</div>;
};

export function BlogMdx(props: {
  Content: ComponentType<Record<string, unknown>>;
}) {
  const nextHeadingId = createHeadingIdFactory();

  const components = {
    h1: (p: ComponentProps<'h1'>) => (
      <h1 className="blog-prose-h1">{p.children}</h1>
    ),
    h2: (p: ComponentProps<'h2'>) => {
      const id = nextHeadingId(flattenText(p.children));
      return (
        <h2 id={id} className="blog-prose-h2">
          {p.children}
        </h2>
      );
    },
    h3: (p: ComponentProps<'h3'>) => {
      const id = nextHeadingId(flattenText(p.children));
      return (
        <h3 id={id} className="blog-prose-h3">
          {p.children}
        </h3>
      );
    },
    p: (p: ComponentProps<'p'>) => <p className="blog-prose-p">{p.children}</p>,
    blockquote: (p: ComponentProps<'blockquote'>) => (
      <blockquote className="blog-prose-quote">{p.children}</blockquote>
    ),
    ul: (p: ComponentProps<'ul'>) => (
      <ul className="blog-prose-ul">{p.children}</ul>
    ),
    ol: (p: ComponentProps<'ol'>) => (
      <ol className="blog-prose-ol">{p.children}</ol>
    ),
    li: (p: ComponentProps<'li'>) => (
      <li className="blog-prose-li">{p.children}</li>
    ),
    a: (p: ComponentProps<'a'>) => (
      <a href={p.href} className="blog-prose-link">
        {p.children}
      </a>
    ),
    hr: () => <hr className="blog-prose-hr" />,
    pre: BlogMdxPre,
    code: (p: ComponentProps<'code'>) => {
      const isInline = !p.className;
      if (!isInline) return <code className={p.className}>{p.children}</code>;
      return <code className="blog-prose-inline-code">{p.children}</code>;
    },
  };

  return (
    <MDXProvider components={components}>
      <props.Content />
    </MDXProvider>
  );
}
