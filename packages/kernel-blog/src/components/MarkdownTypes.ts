import type { ComponentType, ReactNode } from 'react';

export type MarkdownHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

export type LightboxImage = {
  src: string;
  alt?: string;
  caption?: string;
  id?: string;
};

export type LightboxState = {
  images: Array<LightboxImage>;
  currentIndex: number;
  selectedIndex?: number;
  selectedId?: string;
  selectedImage?: LightboxImage;
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

export type BlogMediaEmbedKind = 'audio' | 'video';

export type BlogMediaEmbedProps = {
  href: string;
  title: string;
  src?: string;
  type?: BlogMediaEmbedKind;
  description?: string;
  duration?: string;
  poster?: string;
  provider?: string;
};

export type BlogMediaLinkProps = {
  href: string;
  type?: BlogMediaEmbedKind;
  children?: ReactNode;
  label?: string;
  provider?: string;
};

export type ResolveBlogAssetUrl = (
  articleSourcePath: string,
  assetPath: string,
) => string | undefined;

export type BlogMdxProps = {
  Content: ComponentType<Record<string, unknown>>;
  articleSourcePath: string;
  resolveAssetUrl: ResolveBlogAssetUrl;
  openLightbox?: (state: LightboxState | null) => void;
};
