import { useEffect, useState, type ComponentProps } from 'react';
import { MDXProvider } from '@mdx-js/react';
import 'katex/dist/katex.min.css';

import { BlogMdxPre } from '#blog/components/MarkdownCodeBlock';
import {
  createHeadingIdFactory,
  flattenText,
} from '#blog/components/MarkdownHeading';
import { BlogLightbox } from '#blog/components/MarkdownLightbox';
import {
  createBlogMdxImage,
  createImageGallery,
} from '#blog/components/MarkdownMedia';
import { isMediaOnlyParagraph } from '#blog/components/MarkdownNodes';
import type {
  BlogMdxProps,
  LightboxImage,
} from '#blog/components/MarkdownTypes';

export { extractMarkdownHeadings } from '#blog/components/MarkdownHeading';
export type {
  BlogMdxProps,
  MarkdownHeading,
} from '#blog/components/MarkdownTypes';

export function BlogMdx(props: BlogMdxProps) {
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

  const mediaContext = {
    articleSourcePath: props.articleSourcePath,
    resolveAssetUrl: props.resolveAssetUrl,
    openLightbox,
  };
  const BlogMdxImage = createBlogMdxImage(mediaContext);
  const ImageGallery = createImageGallery(mediaContext);

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
        <BlogLightbox image={lightboxImage} onClose={closeLightbox} />
      ) : null}
    </>
  );
}
