import {
  useState,
  useEffect,
  isValidElement,
  type ReactNode,
  type CSSProperties,
  type ComponentProps,
  type ComponentType,
} from 'react';
import { MDXProvider } from '@mdx-js/react';
import { CopyIcon, Cross2Icon } from '@radix-ui/react-icons';
import hljs from 'highlight.js';
import 'katex/dist/katex.min.css';

import { copyToClipboard } from '#app/lib/browser';
import { resolveBlogAssetUrl } from '#app/lib/blog';

export type MarkdownHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

type LightboxImage = {
  src: string;
  alt?: string;
  caption?: string;
};

type BlogImageGalleryItem =
  | string
  | {
      src: string;
      alt?: string;
      caption?: string;
    };

type BlogImageGalleryProps = {
  images: Array<BlogImageGalleryItem>;
  columns?: 2 | 3 | 4;
};

const parseCodeMeta = (className?: string) => {
  const languageMatch = /language-([^\s]+)/.exec(className ?? '');
  const languageValue = languageMatch?.[1] ?? 'text';
  const [rawLanguage = 'text', rawMeta = ''] = languageValue.split('--meta-');
  const highlightLines = new Set<number>();
  const normalizedMeta = rawMeta.replace(/_/g, ' ');
  const showLineNumbers = /(?:^|[^A-Za-z0-9-])ln(?:$|[^A-Za-z0-9-])/.test(
    normalizedMeta,
  );

  for (const match of rawMeta.matchAll(/\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const rangeMatch = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(part);
      if (!rangeMatch) continue;

      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2] ?? rangeMatch[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

      for (let line = start; line <= end; line += 1) {
        if (line > 0) highlightLines.add(line);
      }
    }
  }

  return { rawLanguage, highlightLines, showLineNumbers };
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

const splitHighlightedCodeLines = (html: string) => {
  return html.split('\n');
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

const toNodeArray = (children: ReactNode) => {
  const list = Array.isArray(children) ? children : [children];
  return list.filter((item) => {
    if (item == null || typeof item === 'boolean') return false;
    if (typeof item === 'string') return item.trim().length > 0;
    return true;
  });
};

const isMediaOnlyParagraph = (children: ReactNode) => {
  const nodes = toNodeArray(children);
  if (nodes.length !== 1) return false;
  const node = nodes[0];
  if (!isValidElement(node)) return false;
  return node.type === 'img';
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 900);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const child = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  if (child && typeof child === 'object' && 'props' in (child as any)) {
    const codeProps = (child as any).props as {
      className?: string;
      children?: unknown;
    };
    const { rawLanguage, highlightLines, showLineNumbers } = parseCodeMeta(
      codeProps.className,
    );
    const code = String(codeProps.children ?? '').replace(/\n$/, '');
    const { html, display } = highlightCodeToHtml(code, rawLanguage);
    const label = (display || rawLanguage || 'txt').toLowerCase();
    const copyText = copyStatus === 'copied' ? '已复制' : '复制';
    const lines = splitHighlightedCodeLines(html);
    const lineNumbers = Array.from({ length: lines.length }, (_, index) =>
      String(index + 1),
    );

    return (
      <div
        className={
          copyStatus === 'copied'
            ? 'blog-prose-pre blog-prose-pre--copied'
            : 'blog-prose-pre'
        }
      >
        <div className="blog-prose-code-block">
          <div className="blog-prose-code-meta">
            <button
              type="button"
              className={
                copyStatus === 'copied'
                  ? 'blog-prose-code-copy blog-prose-code-copy--copied'
                  : 'blog-prose-code-copy'
              }
              aria-label={`复制 ${label} 代码`}
              onClick={(event) => {
                if (event.detail > 0) {
                  event.currentTarget.blur();
                }
                void (async () => {
                  setCopyStatus('idle');
                  const ok = await copyToClipboard(code);
                  setCopyStatus(ok ? 'copied' : 'failed');
                })();
              }}
            >
              <CopyIcon className="blog-prose-code-copy-icon" />
              <span className="blog-prose-code-copy-label">{copyText}</span>
            </button>
            <span className="blog-prose-code-lang" aria-hidden="true">
              {label}
            </span>
          </div>
          <code className={`blog-prose-code hljs language-${rawLanguage}`}>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              return (
                <span
                  key={lineNumber}
                  className={[
                    'blog-prose-code-line',
                    showLineNumbers ? '' : 'blog-prose-code-line--single',
                    highlightLines.has(lineNumber)
                      ? 'blog-prose-code-line--highlight'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {showLineNumbers ? (
                    <span className="blog-prose-code-line-number">
                      {lineNumbers[index]}
                    </span>
                  ) : null}
                  <span
                    className="blog-prose-code-line-content"
                    dangerouslySetInnerHTML={{ __html: line || ' ' }}
                  />
                </span>
              );
            })}
          </code>
        </div>
      </div>
    );
  }

  return <div className="blog-prose-pre">{props.children}</div>;
};

const createLightboxImage = (
  src?: string,
  alt?: string,
  caption?: string,
): LightboxImage | null => {
  if (!src) return null;
  return { src, alt, caption };
};

export function BlogMdx(props: {
  Content: ComponentType<Record<string, unknown>>;
  articleSourcePath: string;
}) {
  const nextHeadingId = createHeadingIdFactory();
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );

  useEffect(() => {
    if (!lightboxImage) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxImage]);

  const openLightbox = (image: LightboxImage | null) => {
    if (!image) return;
    setLightboxImage(image);
  };

  const closeLightbox = () => setLightboxImage(null);

  const BlogMdxImage = (p: ComponentProps<'img'>) => {
    const resolvedSrc = p.src
      ? resolveBlogAssetUrl(props.articleSourcePath, p.src) ?? p.src
      : undefined;

    const image = createLightboxImage(resolvedSrc, p.alt, p.title);
    if (!resolvedSrc) return null;

    return (
      <figure className="blog-prose-image">
        <button
          type="button"
          className="blog-prose-image-button"
          onClick={() => openLightbox(image)}
          aria-label={p.alt ? `放大查看图片：${p.alt}` : '放大查看图片'}
        >
          <img
            src={resolvedSrc}
            alt={p.alt}
            className="blog-prose-image-asset"
            loading="lazy"
          />
        </button>
        {p.title ? (
          <figcaption className="blog-prose-image-caption">
            {p.title}
          </figcaption>
        ) : null}
      </figure>
    );
  };

  const ImageGallery = ({ images, columns = 2 }: BlogImageGalleryProps) => {
    const normalizedImages = images
      .map((item) => (typeof item === 'string' ? { src: item } : { ...item }))
      .map((item) => {
        const resolvedSrc = resolveBlogAssetUrl(
          props.articleSourcePath,
          item.src,
        );
        return resolvedSrc ? { ...item, src: resolvedSrc } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!normalizedImages.length) return null;

    return (
      <div
        className="blog-prose-gallery"
        style={
          {
            ['--blog-gallery-columns' as string]: String(columns),
          } as CSSProperties
        }
      >
        {normalizedImages.map((item, index) => (
          <figure
            key={`${item.src}-${index}`}
            className="blog-prose-gallery-item"
          >
            <button
              type="button"
              className="blog-prose-gallery-button"
              onClick={() =>
                openLightbox(
                  createLightboxImage(item.src, item.alt, item.caption),
                )
              }
              aria-label={
                item.alt ? `放大查看图片：${item.alt}` : '放大查看图片'
              }
            >
              <img
                src={item.src}
                alt={item.alt}
                className="blog-prose-gallery-asset"
                loading="lazy"
              />
            </button>
            {item.caption ? (
              <figcaption className="blog-prose-gallery-caption">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    );
  };

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
    p: (p: ComponentProps<'p'>) => {
      if (isMediaOnlyParagraph(p.children)) {
        return <div className="blog-prose-media-block">{p.children}</div>;
      }
      return <p className="blog-prose-p">{p.children}</p>;
    },
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
    img: BlogMdxImage,
    ImageGallery,
    hr: () => <hr className="blog-prose-hr" />,
    pre: BlogMdxPre,
    code: (p: ComponentProps<'code'>) => {
      const isInline = !p.className;
      if (!isInline) return <code className={p.className}>{p.children}</code>;
      return <code className="blog-prose-inline-code">{p.children}</code>;
    },
  };

  return (
    <>
      <MDXProvider components={components}>
        <props.Content />
      </MDXProvider>

      {lightboxImage ? (
        <div
          className="blog-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="blog-lightbox-close"
            onClick={closeLightbox}
            aria-label="关闭图片预览"
          >
            <Cross2Icon />
          </button>
          <figure
            className="blog-lightbox-figure"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="blog-lightbox-image"
            />
            {lightboxImage.caption ? (
              <figcaption className="blog-lightbox-caption">
                {lightboxImage.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}
