import { useEffect } from 'react';

const SITE_NAME = 'chentao.arthur';
const DEFAULT_DESCRIPTION =
  '陈涛的个人网站，记录前端工程、技术文章和个人简历。';

type PageMeta = {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  canonicalPath?: string;
};

const resolveAbsoluteUrl = (value: string) => {
  return new URL(value, window.location.origin).href;
};

const resolveCanonicalUrl = (path?: string) => {
  if (!path) return window.location.href;
  const base = (window.__APP_BASE__ || '/').replace(/\/$/, '');
  const pathname = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return resolveAbsoluteUrl(pathname || '/');
};

const setMeta = (
  selector: 'name' | 'property',
  key: string,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${selector}="${key}"]`,
  );

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(selector, key);
    document.head.appendChild(element);
  }

  element.content = content;
};

const removeMeta = (selector: 'name' | 'property', key: string) => {
  document.head
    .querySelector<HTMLMetaElement>(`meta[${selector}="${key}"]`)
    ?.remove();
};

const setCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
};

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const description = meta.description ?? DEFAULT_DESCRIPTION;
    const fullTitle =
      meta.title === SITE_NAME ? SITE_NAME : `${meta.title} | ${SITE_NAME}`;
    const canonicalUrl = resolveCanonicalUrl(meta.canonicalPath);
    const imageUrl = meta.image ? resolveAbsoluteUrl(meta.image) : undefined;

    document.title = fullTitle;
    setCanonical(canonicalUrl);

    setMeta('name', 'description', description);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', meta.type ?? 'website');
    setMeta('property', 'og:url', canonicalUrl);
    setMeta(
      'name',
      'twitter:card',
      imageUrl ? 'summary_large_image' : 'summary',
    );
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);

    if (imageUrl) {
      setMeta('property', 'og:image', imageUrl);
      setMeta('name', 'twitter:image', imageUrl);
    } else {
      removeMeta('property', 'og:image');
      removeMeta('name', 'twitter:image');
    }
  }, [meta.canonicalPath, meta.description, meta.image, meta.title, meta.type]);
}
