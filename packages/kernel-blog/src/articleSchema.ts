import { parse } from 'yaml';
import type { BlogArticleFrontmatter } from '#blog/articleTypes';

const FRONTMATTER_BOUNDARY = '---';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const assertRequiredText = (
  value: unknown,
  fieldName: keyof BlogArticleFrontmatter,
  sourcePath: string,
) => {
  const text = asString(value);
  if (!text) {
    throw new Error(`Missing required field "${fieldName}" in ${sourcePath}.`);
  }
  return text;
};

const normalizeTags = (value: unknown, sourcePath: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`Field "tags" must be an array in ${sourcePath}.`);
  }

  const tags = value
    .map((item) => asString(item))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);

  if (!tags.length) {
    throw new Error(
      `Field "tags" must contain at least one tag in ${sourcePath}.`,
    );
  }

  return tags;
};

const normalizeCover = (value: unknown, sourcePath: string) => {
  if (value == null) return undefined;
  const cover = asString(value);
  if (!cover) {
    throw new Error(
      `Field "cover" must be a non-empty string in ${sourcePath}.`,
    );
  }
  return cover;
};

const assertDateString = (
  value: unknown,
  fieldName: 'publishedAt' | 'updatedAt',
  sourcePath: string,
) => {
  const text = assertRequiredText(value, fieldName, sourcePath);
  const timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) {
    throw new Error(
      `Field "${fieldName}" must be a valid date string in ${sourcePath}.`,
    );
  }
  return text;
};

const normalizeSummary = (value: unknown, sourcePath: string) => {
  if (value == null) return undefined;
  const summary = asString(value);
  if (!summary) {
    throw new Error(
      `Field "summary" must be a non-empty string in ${sourcePath}.`,
    );
  }
  return summary;
};

export const extractFrontmatter = (source: string, sourcePath: string) => {
  const normalizedSource = source.replace(/^\uFEFF/, '');
  if (
    !normalizedSource.startsWith(`${FRONTMATTER_BOUNDARY}\n`) &&
    !normalizedSource.startsWith(`${FRONTMATTER_BOUNDARY}\r\n`)
  ) {
    throw new Error(`Missing frontmatter block in ${sourcePath}.`);
  }

  const lines = normalizedSource.split(/\r?\n/);
  let boundaryEndIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === FRONTMATTER_BOUNDARY) {
      boundaryEndIndex = index;
      break;
    }
  }

  if (boundaryEndIndex === -1) {
    throw new Error(`Unclosed frontmatter block in ${sourcePath}.`);
  }

  const frontmatterSource = lines.slice(1, boundaryEndIndex).join('\n');
  const content = lines
    .slice(boundaryEndIndex + 1)
    .join('\n')
    .replace(/^\n+/, '');

  const parsed = parseFrontmatter(frontmatterSource, sourcePath);
  if (!isRecord(parsed)) {
    throw new Error(`Frontmatter must be an object in ${sourcePath}.`);
  }

  return {
    frontmatter: normalizeBlogArticleFrontmatter(parsed, sourcePath),
    content,
  };
};

export const normalizeBlogArticleFrontmatter = (
  input: unknown,
  sourcePath: string,
): BlogArticleFrontmatter => {
  if (!isRecord(input)) {
    throw new Error(`Frontmatter must be an object in ${sourcePath}.`);
  }

  return {
    title: assertRequiredText(input.title, 'title', sourcePath),
    slug: assertRequiredText(input.slug, 'slug', sourcePath),
    tags: normalizeTags(input.tags, sourcePath),
    publishedAt: assertDateString(input.publishedAt, 'publishedAt', sourcePath),
    updatedAt: assertDateString(input.updatedAt, 'updatedAt', sourcePath),
    summary: normalizeSummary(input.summary, sourcePath),
    cover: normalizeCover(input.cover, sourcePath),
  };
};
const parseFrontmatter = (source: string, sourcePath: string) => {
  try {
    return parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid frontmatter in ${sourcePath}: ${message}`);
  }
};
