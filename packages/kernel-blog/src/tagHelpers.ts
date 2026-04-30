import type { BlogTagMap, BlogTagSummary } from '#blog/articleTypes';

export const sortBlogTagSummaries = (items: Array<BlogTagSummary>) => {
  return items.sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.label.localeCompare(right.label);
  });
};

export const createBlogTagSummaries = (
  tagMap: BlogTagMap,
  counts: Map<string, number>,
) => {
  const items = Object.entries(tagMap).map(([key, value]) => ({
    key,
    ...value,
    count: counts.get(key) ?? 0,
  }));

  return sortBlogTagSummaries(items);
};
