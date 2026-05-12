import type { ComponentType, ReactNode } from 'react';

export type Heading = {
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

export type ImageGalleryItem =
  | string
  | {
      src: string;
      alt?: string;
      caption?: string;
    };

export type ImageGalleryProps = {
  images: Array<ImageGalleryItem>;
  columns?: 2 | 3 | 4;
};

export type AudioEmbedProps = {
  href?: string;
  title: string;
  src?: string;
  description?: string;
  duration?: string;
  provider?: string;
};

export type VideoEmbedProps = {
  href?: string;
  title: string;
  src?: string;
  description?: string;
  duration?: string;
  poster?: string;
  provider?: string;
};

export type AudioLinkProps = {
  href?: string;
  src?: string;
  children?: ReactNode;
  label?: string;
  provider?: string;
};

export type VideoLinkProps = {
  href?: string;
  src?: string;
  children?: ReactNode;
  label?: string;
  provider?: string;
};

export type WebEmbedProps = {
  src: string;
  href?: string;
  title: string;
  description?: string;
  provider?: string;
  height?: number | string;
  allow?: string;
  allowFullScreen?: boolean;
};

export type XPostEmbedProps = {
  url?: string;
  id?: string;
  title?: string;
  height?: number | string;
};

export type GitHubMentionProps = {
  username: string;
  name?: string;
  href?: string;
  avatarUrl?: string;
  bio?: string;
  followers?: string | number;
  repositories?: string | number;
};

export type GitHubRepoProps = {
  repo: string;
  label?: string;
  href?: string;
  description?: string;
  language?: string;
  stars?: string | number;
  owner?: string;
  ownerAvatarUrl?: string;
};

export type UrlLinkProps = {
  href: string;
  label?: string;
  children?: ReactNode;
};

export type FancyListItem =
  | ReactNode
  | {
      title?: ReactNode;
      content: ReactNode | Array<ReactNode>;
    };

export type FancyListProps = {
  title?: ReactNode;
  items: Array<FancyListItem>;
  className?: string;
};

export type CalloutTone = 'note' | 'tip' | 'warning' | 'success' | 'error';

export type CalloutProps = {
  tone?: CalloutTone;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type EnglishCardExample =
  | ReactNode
  | {
      text: ReactNode;
      translation?: ReactNode;
    };

export type EnglishCardDetail = {
  label: ReactNode;
  items: Array<ReactNode>;
};

export type EnglishCardItem = {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  translation?: ReactNode | Array<ReactNode>;
  explanation?: ReactNode | Array<ReactNode>;
  example?: EnglishCardExample | Array<EnglishCardExample>;
  details?: Array<EnglishCardDetail>;
  resources?: Array<EnglishCardResource>;
  note?: ReactNode;
  tags?: Array<string>;
};

export type EnglishCardResource = {
  label: ReactNode;
  href: string;
  title?: ReactNode;
  description?: ReactNode;
};

export type EnglishCardsOpenApiConfig = {
  enabled?: boolean;
  language?: string;
  endpoint?: string;
};

export type EnglishCardsProps = {
  title?: ReactNode;
  words?: Array<string>;
  items?: Array<EnglishCardItem>;
  openApi?: boolean | EnglishCardsOpenApiConfig;
  defaultMode?: 'study' | 'practice';
  className?: string;
};

export type StepsProps = {
  title?: ReactNode;
  direction?: 'vertical' | 'horizontal';
  markerColor?: string;
  markerTextColor?: string;
  className?: string;
  children?: ReactNode;
};

export type StepProps = {
  title?: ReactNode;
  markerColor?: string;
  markerTextColor?: string;
  className?: string;
  children?: ReactNode;
};

export type ResolveAssetUrl = (
  articleSourcePath: string,
  assetPath: string,
) => string | undefined;

export type MdxProps = {
  Content: ComponentType<Record<string, unknown>>;
  articleSourcePath: string;
  resolveAssetUrl: ResolveAssetUrl;
  openLightbox?: (state: LightboxState | null) => void;
};
