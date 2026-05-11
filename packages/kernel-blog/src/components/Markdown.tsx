import { MDXProvider } from '@mdx-js/react';
import {
  createElement,
  memo,
  useCallback,
  useRef,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from 'react';
import 'katex/dist/katex.min.css';
import '#blog/components/Markdown.css';

import { BlogMdxPre } from '#blog/components/MarkdownCodeBlock';
import {
  createHeadingIdFactory,
  flattenText,
} from '#blog/components/MarkdownHeading';
import { createAudioEmbed } from '#blog/components/MarkdownAudioEmbed';
import { createAudioLink } from '#blog/components/MarkdownAudioLink';
import { createBlogMdxImage } from '#blog/components/MarkdownImage';
import { createImageGallery } from '#blog/components/MarkdownImageGallery';
import { BlogMdxGitHubMention } from '#blog/components/MarkdownGitHubMention';
import { BlogMdxGitHubRepo } from '#blog/components/MarkdownGitHubRepo';
import { BlogMdxUrlLink } from '#blog/components/MarkdownUrlLink';
import { createVideoEmbed } from '#blog/components/MarkdownVideoEmbed';
import { createVideoLink } from '#blog/components/MarkdownVideoLink';
import { BlogMdxWebEmbed } from '#blog/components/MarkdownWebEmbed';
import { BlogMdxXPostEmbed } from '#blog/components/MarkdownXPostEmbed';
import { isMediaOnlyParagraph } from '#blog/components/MarkdownNodes';
import { BlogMdxChatThread } from '#blog/components/MarkdownChat';
import { BlogMdxCallout } from '#blog/components/MarkdownCallout';
import { BlogMdxDetailsBlock } from '#blog/components/MarkdownDetailsBlock';
import { BlogMdxFancyList } from '#blog/components/MarkdownFancyList';
import { BlogMdxFileTree } from '#blog/components/MarkdownFileTree';
import { BlogMdxPoem } from '#blog/components/MarkdownPoem';
import { BlogMdxStep, BlogMdxSteps } from '#blog/components/MarkdownSteps';
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

function BlogMdxImpl(props: BlogMdxProps) {
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
  const nextHeadingIdRef = useRef(createHeadingIdFactory());
  const openLightbox = useCallback(
    (state: LightboxState | null) => {
      if (!state || !state.images.length) return;
      props.openLightbox?.(state);
    },
    [props.openLightbox],
  );
  const isPresetColor = (value?: string): value is PresetColor =>
    presetColors.includes(value as PresetColor);
  const renderColorText = useCallback(
    ({ color, preset, c, className, children }: ColorTextProps) => {
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
    },
    [],
  );

  const BlogMdxImage = useMemo(
    () =>
      createBlogMdxImage({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );
  const ImageGallery = useMemo(
    () =>
      createImageGallery({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );
  const AudioEmbed = useMemo(
    () =>
      createAudioEmbed({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );
  const VideoEmbed = useMemo(
    () =>
      createVideoEmbed({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );
  const AudioLink = useMemo(
    () =>
      createAudioLink({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );
  const VideoLink = useMemo(
    () =>
      createVideoLink({
        articleSourcePath: props.articleSourcePath,
        resolveAssetUrl: props.resolveAssetUrl,
        openLightbox,
      }),
    [openLightbox, props.articleSourcePath, props.resolveAssetUrl],
  );

  const renderHeading = useCallback(
    (tag: HeadingTag, className: string, p: ComponentProps<'h1'>) => {
      const text = flattenText(p.children);
      const id = nextHeadingIdRef.current(text);
      const label = text ? `定位到标题：${text}` : '定位到当前标题';

      return createElement(
        tag,
        { id, className },
        <a
          href={`#${id}`}
          className="blog-prose-heading-link"
          aria-label={label}
        >
          {p.children}
        </a>,
      );
    },
    [],
  );

  const components = useMemo(
    () => ({
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
      AudioEmbed,
      VideoEmbed,
      WebEmbed: BlogMdxWebEmbed,
      XPostEmbed: BlogMdxXPostEmbed,
      GitHubMention: BlogMdxGitHubMention,
      GitHubRepo: BlogMdxGitHubRepo,
      UrlLink: BlogMdxUrlLink,
      AudioLink,
      VideoLink,
      ChatThread: BlogMdxChatThread,
      Callout: BlogMdxCallout,
      FancyList: BlogMdxFancyList,
      FileTree: BlogMdxFileTree,
      Step: BlogMdxStep,
      Steps: BlogMdxSteps,
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
    }),
    [
      ImageGallery,
      AudioEmbed,
      VideoEmbed,
      AudioLink,
      VideoLink,
      BlogMdxImage,
      BlogMdxWebEmbed,
      BlogMdxChatThread,
      BlogMdxCallout,
      BlogMdxDetailsBlock,
      BlogMdxFancyList,
      BlogMdxFileTree,
      BlogMdxGitHubMention,
      BlogMdxGitHubRepo,
      BlogMdxPoem,
      BlogMdxStep,
      BlogMdxSteps,
      BlogMdxSummaryCards,
      BlogMdxUrlLink,
      BlogMdxXPostEmbed,
      renderColorText,
      renderHeading,
    ],
  );

  return (
    <MDXProvider components={components}>
      <props.Content />
    </MDXProvider>
  );
}

export const BlogMdx = memo(BlogMdxImpl);
