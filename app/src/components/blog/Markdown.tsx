import {
  isValidElement,
  useEffect,
  useState,
  type CSSProperties,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import { MDXProvider } from '@mdx-js/react';
import { Cross2Icon } from '@radix-ui/react-icons';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';

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
    const label = (display || rawLanguage || 'txt').toUpperCase();

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
