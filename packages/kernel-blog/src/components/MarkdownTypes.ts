import type { ComponentType } from 'react';

export type MarkdownHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

export type LightboxImage = {
  src: string;
  alt?: string;
  caption?: string;
};

export type BlogImageGalleryItem =
  | string
  | {
      src: string;
      alt?: string;
      caption?: string;
    };

export type BlogImageGalleryProps = {
  images: Array<BlogImageGalleryItem>;
  columns?: 2 | 3 | 4;
};

export type ResolveBlogAssetUrl = (
  articleSourcePath: string,
  assetPath: string,
) => string | undefined;

export type BlogMdxProps = {
  Content: ComponentType<Record<string, unknown>>;
  articleSourcePath: string;
  resolveAssetUrl: ResolveBlogAssetUrl;
};
