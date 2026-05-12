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

export type BlogAudioEmbedProps = {
  href?: string;
  title: string;
  src?: string;
  description?: string;
  duration?: string;
  provider?: string;
};

export type BlogVideoEmbedProps = {
  href?: string;
  title: string;
  src?: string;
  description?: string;
  duration?: string;
  poster?: string;
  provider?: string;
};

export type BlogAudioLinkProps = {
  href?: string;
  src?: string;
  children?: ReactNode;
  label?: string;
  provider?: string;
};

export type BlogVideoLinkProps = {
  href?: string;
  src?: string;
  children?: ReactNode;
  label?: string;
  provider?: string;
};

export type BlogWebEmbedProps = {
  src: string;
  href?: string;
  title: string;
  description?: string;
  provider?: string;
  height?: number | string;
  allow?: string;
  allowFullScreen?: boolean;
};

export type BlogXPostEmbedProps = {
  url?: string;
  id?: string;
  title?: string;
  height?: number | string;
};

export type BlogGitHubMentionProps = {
  username: string;
  name?: string;
  href?: string;
  avatarUrl?: string;
  bio?: string;
  followers?: string | number;
  repositories?: string | number;
};

export type BlogGitHubRepoProps = {
  repo: string;
  label?: string;
  href?: string;
  description?: string;
  language?: string;
  stars?: string | number;
  owner?: string;
  ownerAvatarUrl?: string;
};

export type BlogUrlLinkProps = {
  href: string;
  label?: string;
  children?: ReactNode;
};

export type BlogFancyListItem =
  | ReactNode
  | {
      title?: ReactNode;
      content: ReactNode | Array<ReactNode>;
    };

export type BlogFancyListProps = {
  title?: ReactNode;
  items: Array<BlogFancyListItem>;
  className?: string;
};

export type BlogCalloutTone = 'note' | 'tip' | 'warning' | 'success' | 'error';

export type BlogCalloutProps = {
  tone?: BlogCalloutTone;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type BlogEnglishCardExample =
  | ReactNode
  | {
      text: ReactNode;
      translation?: ReactNode;
    };

export type BlogEnglishCardDetail = {
  label: ReactNode;
  items: Array<ReactNode>;
};

export type BlogEnglishCardItem = {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  translation?: ReactNode | Array<ReactNode>;
  explanation?: ReactNode | Array<ReactNode>;
  example?: BlogEnglishCardExample | Array<BlogEnglishCardExample>;
  details?: Array<BlogEnglishCardDetail>;
  resources?: Array<BlogEnglishCardResource>;
  note?: ReactNode;
  tags?: Array<string>;
};

export type BlogEnglishCardResource = {
  label: ReactNode;
  href: string;
  title?: ReactNode;
  description?: ReactNode;
};

export type BlogEnglishCardsOpenApiConfig = {
  enabled?: boolean;
  language?: string;
  endpoint?: string;
};

export type BlogEnglishCardsProps = {
  title?: ReactNode;
  words?: Array<string>;
  items?: Array<BlogEnglishCardItem>;
  openApi?: boolean | BlogEnglishCardsOpenApiConfig;
  defaultMode?: 'study' | 'practice';
  className?: string;
};

export type BlogStepsProps = {
  title?: ReactNode;
  direction?: 'vertical' | 'horizontal';
  markerColor?: string;
  markerTextColor?: string;
  className?: string;
  children?: ReactNode;
};

export type BlogStepProps = {
  title?: ReactNode;
  markerColor?: string;
  markerTextColor?: string;
  className?: string;
  children?: ReactNode;
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
