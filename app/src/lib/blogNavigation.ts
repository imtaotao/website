import type { To } from 'react-router';

export const BLOG_TAG_QUERY_KEY = 'tag';

export const createBlogTagNavigation = (tag?: string): To => {
  const normalizedTag = tag?.trim();

  if (!normalizedTag) {
    return { pathname: '/blog' };
  }

  const searchParams = new URLSearchParams({
    [BLOG_TAG_QUERY_KEY]: normalizedTag,
  });

  return {
    pathname: '/blog',
    search: `?${searchParams.toString()}`,
  };
};
