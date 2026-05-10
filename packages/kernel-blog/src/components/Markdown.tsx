import { MDXProvider } from '@mdx-js/react';
import { createElement, type ComponentProps, type ReactNode } from 'react';
import 'katex/dist/katex.min.css';

import { BlogMdxPre } from '#blog/components/MarkdownCodeBlock';
import {
  createHeadingIdFactory,
  flattenText,
} from '#blog/components/MarkdownHeading';
import {
  createBlogMdxImage,
  createImageGallery,
  createMediaEmbed,
  createMediaLink,
} from '#blog/components/MarkdownMedia';
import { isMediaOnlyParagraph } from '#blog/components/MarkdownNodes';
import { BlogMdxChatThread } from '#blog/components/MarkdownChat';
import { BlogMdxDetailsBlock } from '#blog/components/MarkdownDetailsBlock';
import { BlogMdxPoem } from '#blog/components/MarkdownPoem';
import { BlogMdxSummaryCards } from '#blog/components/MarkdownSummaryCards';
import type {
  BlogMdxProps,
  LightboxState,
} from '#blog/components/MarkdownTypes';

export { extractMarkdownHeadings } from '#blog/components/MarkdownHeading';
export type {
  BlogMdxProps,
  MarkdownHeading,
} from '#blog/components/MarkdownTypes';

export function BlogMdx(props: BlogMdxProps) {
  const presetColors = [
    'gray',
    'blue',
    'green',
    'cyan',
    'orange',
    'red',
    'purple',
    'pink',
  ] as const;
  type PresetColor = (typeof presetColors)[number];
  type ColorTextProps = {
    color?: string;
    preset?: PresetColor;
    c?: PresetColor;
    className?: string;
    children?: ReactNode;
  };
  type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const nextHeadingId = createHeadingIdFactory();
  const openLightbox = (state: LightboxState | null) => {
    if (!state || !state.images.length) return;
    props.openLightbox?.(state);
  };
  const isPresetColor = (value?: string): value is PresetColor =>
    presetColors.includes(value as PresetColor);
  const renderColorText = ({
    color,
    preset,
    c,
    className,
    children,
  }: ColorTextProps) => {
    const resolvedPreset =
      c ?? preset ?? (isPresetColor(color) ? color : undefined);
    const resolvedColor = resolvedPreset
      ? `var(--blog-color-${resolvedPreset})`
      : color;

    return (
      <span
        className={['blog-prose-color-text', className]
          .filter(Boolean)
          .join(' ')}
        style={resolvedColor ? { color: resolvedColor } : undefined}
      >
        {children}
      </span>
    );
  };

  const mediaContext = {
    articleSourcePath: props.articleSourcePath,
    resolveAssetUrl: props.resolveAssetUrl,
    openLightbox,
  };
  const BlogMdxImage = createBlogMdxImage(mediaContext);
  const ImageGallery = createImageGallery(mediaContext);
  const MediaEmbed = createMediaEmbed(mediaContext);
  const MediaLink = createMediaLink();

  const renderHeading = (
    tag: HeadingTag,
    className: string,
    p: ComponentProps<'h1'>,
  ) => {
    const text = flattenText(p.children);
    const id = nextHeadingId(text);
    const label = text ? `定位到标题：${text}` : '定位到当前标题';

    return createElement(
      tag,
      { id, className },
      <a href={`#${id}`} className="blog-prose-heading-link" aria-label={label}>
        {p.children}
      </a>,
    );
  };

  const components = {
    h1: (p: ComponentProps<'h1'>) => renderHeading('h1', 'blog-prose-h1', p),
    h2: (p: ComponentProps<'h2'>) => renderHeading('h2', 'blog-prose-h2', p),
    h3: (p: ComponentProps<'h3'>) => renderHeading('h3', 'blog-prose-h3', p),
    h4: (p: ComponentProps<'h4'>) => renderHeading('h4', 'blog-prose-h4', p),
    h5: (p: ComponentProps<'h5'>) => renderHeading('h5', 'blog-prose-h5', p),
    h6: (p: ComponentProps<'h6'>) => renderHeading('h6', 'blog-prose-h6', p),
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
    mark: (p: ComponentProps<'mark'>) => {
      const { className, children, ...rest } = p;
      return (
        <mark
          className={['blog-prose-mark', className].filter(Boolean).join(' ')}
          {...rest}
        >
          {children}
        </mark>
      );
    },
    ColorText: renderColorText,
    Color: renderColorText,
    a: (p: ComponentProps<'a'>) => (
      <a href={p.href} className="blog-prose-link">
        {p.children}
      </a>
    ),
    img: BlogMdxImage,
    ImageGallery,
    MediaEmbed,
    MediaLink,
    ChatThread: BlogMdxChatThread,
    DetailsBlock: BlogMdxDetailsBlock,
    Poem: BlogMdxPoem,
    SummaryCards: BlogMdxSummaryCards,
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
