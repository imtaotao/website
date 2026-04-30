import { describe, expect, test } from 'vitest';

import {
  getAllArticles,
  getAllTags,
  getArticleBySlug,
  getArticlesByTag,
  getTagByKey,
  type BlogTagMap,
} from '#index';

type ArticleSourceModules = Record<string, string>;

const createArticleSourceModules = (
  entries: Array<{ slug: string; source: string }>,
): ArticleSourceModules => {
  return Object.fromEntries(
    entries.map(({ slug, source }) => [
      `/virtual/blog/${slug}/index.mdx`,
      source,
    ]),
  );
};

const tagMap: BlogTagMap = {
  react: {
    label: 'React',
    description: 'React related posts',
    order: 10,
  },
  typescript: {
    label: 'TypeScript',
    description: 'TypeScript notes',
    order: 20,
  },
};

describe('kernel-blog content loading', () => {
  test('loads blog articles, sorts them, and aggregates tags', () => {
    const articleSourceModules = createArticleSourceModules([
      {
        slug: 'older-post',
        source: `---
title: Older post
slug: older-post
tags:
  - react
publishedAt: 2026-04-01
updatedAt: 2026-04-02
summary: Older summary
cover: ./cover.jpg
---

# Older post
`,
      },
      {
        slug: 'newer-post',
        source: `---
title: Newer post
slug: newer-post
tags:
  - react
  - typescript
publishedAt: 2026-04-10
updatedAt: 2026-04-11
summary: Newer summary
---

# Newer post
`,
      },
    ]);

    const articles = getAllArticles({ articleSourceModules, tagMap });
    const tags = getAllTags({ articleSourceModules, tagMap });

    expect(articles.map((article) => article.slug)).toEqual([
      'newer-post',
      'older-post',
    ]);
    expect(articles[0]?.cover).toBeUndefined();
    expect(articles[1]?.cover).toBe('./cover.jpg');
    expect(tags).toEqual([
      {
        key: 'react',
        label: 'React',
        description: 'React related posts',
        order: 10,
        count: 2,
      },
      {
        key: 'typescript',
        label: 'TypeScript',
        description: 'TypeScript notes',
        order: 20,
        count: 1,
      },
    ]);
  });

  test('returns article content by slug and filters by tag', () => {
    const articleSourceModules = createArticleSourceModules([
      {
        slug: 'entry',
        source: `---
title: Entry
slug: entry
tags:
  - react
publishedAt: 2026-04-10
updatedAt: 2026-04-10
summary: Entry summary
cover: ./cover.png
---

Hello world
`,
      },
    ]);

    const article = getArticleBySlug('entry', { articleSourceModules, tagMap });
    const byTag = getArticlesByTag('react', { articleSourceModules, tagMap });
    const tag = getTagByKey('react', { articleSourceModules, tagMap });

    expect(article?.content).toContain('Hello world');
    expect(article?.articleDir).toContain('/virtual/blog/entry');
    expect(byTag).toHaveLength(1);
    expect(tag?.count).toBe(1);
  });

  test('throws on unknown tags', () => {
    const articleSourceModules = createArticleSourceModules([
      {
        slug: 'bad-entry',
        source: `---
title: Bad entry
slug: bad-entry
tags:
  - unknown
publishedAt: 2026-04-10
updatedAt: 2026-04-10
summary: Bad summary
---

Hello
`,
      },
    ]);

    expect(() => getAllArticles({ articleSourceModules, tagMap })).toThrow(
      'Unknown tag "unknown"',
    );
  });
});
