import { MDXProvider } from '@mdx-js/react';
import {
  memo,
  useRef,
  useMemo,
  useCallback,
  createElement,
  type ReactNode,
  type ComponentProps,
} from 'react';

import { MdxPre } from '#markdown/components/CodeBlock';
import {
  flattenText,
  createHeadingIdFactory,
} from '#markdown/components/Heading';
import { createAudioEmbed } from '#markdown/components/AudioEmbed';
import { createAudioLink } from '#markdown/components/AudioLink';
import { createMdxImage } from '#markdown/components/Image';
import { createImageGallery } from '#markdown/components/ImageGallery';
import { MdxGitHubMention } from '#markdown/components/GitHubMention';
import { MdxGitHubRepo } from '#markdown/components/GitHubRepo';
import { MdxUrlLink } from '#markdown/components/UrlLink';
import { createVideoEmbed } from '#markdown/components/VideoEmbed';
import { createVideoLink } from '#markdown/components/VideoLink';
import { MdxWebEmbed } from '#markdown/components/WebEmbed';
import { MdxXPostEmbed } from '#markdown/components/XPostEmbed';
import { isMediaOnlyParagraph } from '#markdown/components/Nodes';
import { MdxChatThread } from '#markdown/components/Chat';
import { MdxCallout } from '#markdown/components/Callout';
import { MdxDetailsBlock } from '#markdown/components/DetailsBlock';
import { MdxEnglishCards } from '#markdown/components/EnglishCards';
import { MdxFancyList } from '#markdown/components/FancyList';
import { MdxPoem } from '#markdown/components/Poem';
import { MdxStep, MdxSteps } from '#markdown/components/Steps';
import { MdxSummaryCards } from '#markdown/components/SummaryCards';
import type { MdxProps, LightboxState } from '#markdown/components/Types';

export { extractHeadings } from '#markdown/components/Heading';
export type { MdxProps, Heading } from '#markdown/components/Types';

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

type HeadingComponent = ((p: ComponentProps<'h1'>) => ReactNode) & {
  mdxHeadingTag: HeadingTag;
};

function MdxImpl(props: MdxProps) {
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
        ? `var(--markdown-color-${resolvedPreset})`
        : color;

      return (
        <span
          className={['markdown-prose-color-text', className]
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

  const MdxImage = useMemo(
    () =>
      createMdxImage({
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
          className="markdown-prose-heading-link"
          aria-label={label}
        >
          {p.children}
        </a>,
      );
    },
    [],
  );

  const components = useMemo(() => {
    const createHeadingComponent = (
      tag: HeadingTag,
      className: string,
    ): HeadingComponent => {
      const Heading = ((p: ComponentProps<'h1'>) =>
        renderHeading(tag, className, p)) as unknown as HeadingComponent;
      Heading.mdxHeadingTag = tag;
      return Heading;
    };

    return {
      h1: createHeadingComponent('h1', 'markdown-prose-h1'),
      h2: createHeadingComponent('h2', 'markdown-prose-h2'),
      h3: createHeadingComponent('h3', 'markdown-prose-h3'),
      h4: createHeadingComponent('h4', 'markdown-prose-h4'),
      h5: createHeadingComponent('h5', 'markdown-prose-h5'),
      h6: createHeadingComponent('h6', 'markdown-prose-h6'),
      p: (p: ComponentProps<'p'>) => {
        if (isMediaOnlyParagraph(p.children)) {
          return <div className="markdown-prose-media-block">{p.children}</div>;
        }
        return <p className="markdown-prose-p">{p.children}</p>;
      },
      blockquote: (p: ComponentProps<'blockquote'>) => (
        <blockquote className="markdown-prose-quote">{p.children}</blockquote>
      ),
      ul: (p: ComponentProps<'ul'>) => (
        <ul className="markdown-prose-ul">{p.children}</ul>
      ),
      ol: (p: ComponentProps<'ol'>) => (
        <ol className="markdown-prose-ol">{p.children}</ol>
      ),
      li: (p: ComponentProps<'li'>) => (
        <li className="markdown-prose-li">{p.children}</li>
      ),
      mark: (p: ComponentProps<'mark'>) => {
        const { className, children, ...rest } = p;
        return (
          <mark
            className={['markdown-prose-mark', className]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          >
            {children}
          </mark>
        );
      },
      ColorText: renderColorText,
      Color: renderColorText,
      a: (p: ComponentProps<'a'>) => (
        <a href={p.href} className="markdown-prose-link">
          {p.children}
        </a>
      ),
      img: MdxImage,
      ImageGallery,
      AudioEmbed,
      VideoEmbed,
      WebEmbed: MdxWebEmbed,
      XPostEmbed: MdxXPostEmbed,
      GitHubMention: MdxGitHubMention,
      GitHubRepo: MdxGitHubRepo,
      UrlLink: MdxUrlLink,
      AudioLink,
      VideoLink,
      ChatThread: MdxChatThread,
      Callout: MdxCallout,
      EnglishCards: MdxEnglishCards,
      FancyList: MdxFancyList,
      Step: MdxStep,
      Steps: MdxSteps,
      DetailsBlock: MdxDetailsBlock,
      Poem: MdxPoem,
      SummaryCards: MdxSummaryCards,
      hr: () => <hr className="markdown-prose-hr" />,
      pre: MdxPre,
      code: (p: ComponentProps<'code'>) => {
        const isInline = !p.className;
        if (!isInline) return <code className={p.className}>{p.children}</code>;
        return <code className="markdown-prose-inline-code">{p.children}</code>;
      },
    };
  }, [
    ImageGallery,
    AudioEmbed,
    VideoEmbed,
    AudioLink,
    VideoLink,
    MdxImage,
    MdxWebEmbed,
    MdxChatThread,
    MdxCallout,
    MdxDetailsBlock,
    MdxEnglishCards,
    MdxFancyList,
    MdxGitHubMention,
    MdxGitHubRepo,
    MdxPoem,
    MdxStep,
    MdxSteps,
    MdxSummaryCards,
    MdxUrlLink,
    MdxXPostEmbed,
    renderColorText,
    renderHeading,
  ]);

  return (
    <MDXProvider components={components}>
      <props.Content />
    </MDXProvider>
  );
}

export const Mdx = memo(MdxImpl);
