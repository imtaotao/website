import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  getAllArticles,
  getAllTags,
  getArticleBySlug,
  getArticlesByTag,
  getTagByKey,
  type BlogTagMap,
} from '#index';

const tempDirs: Array<string> = [];

const createTempArticlesDir = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-blog-'));
  tempDirs.push(tempDir);

  const articlesDir = path.join(tempDir, 'articles');
  fs.mkdirSync(articlesDir);
  return articlesDir;
};

const writeArticle = (articlesDir: string, dirname: string, source: string) => {
  const articleDir = path.join(articlesDir, dirname);
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(path.join(articleDir, 'index.mdx'), source);
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

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('kernel-blog content loading', () => {
  test('loads blog articles, sorts them, and aggregates tags', () => {
    const articlesDir = createTempArticlesDir();

    writeArticle(
      articlesDir,
      'older-post',
      `---
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
    );

    writeArticle(
      articlesDir,
      'newer-post',
      `---
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
    );

    const articles = getAllArticles({ articlesDir, tagMap });
    const tags = getAllTags({ articlesDir, tagMap });

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
    const articlesDir = createTempArticlesDir();

    writeArticle(
      articlesDir,
      'entry',
      `---
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
    );

    const article = getArticleBySlug('entry', { articlesDir, tagMap });
    const byTag = getArticlesByTag('react', { articlesDir, tagMap });
    const tag = getTagByKey('react', { articlesDir, tagMap });

    expect(article?.content).toContain('Hello world');
    expect(article?.articleDir).toContain(path.join('articles', 'entry'));
    expect(byTag).toHaveLength(1);
    expect(tag?.count).toBe(1);
  });

  test('throws on unknown tags', () => {
    const articlesDir = createTempArticlesDir();

    writeArticle(
      articlesDir,
      'bad-entry',
      `---
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
    );

    expect(() => getAllArticles({ articlesDir, tagMap })).toThrow(
      'Unknown tag "unknown"',
    );
  });
});
