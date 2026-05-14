import { dirname, join, normalize, relative } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

type BlogIssue = {
  file: string;
  message: string;
};

type BlogFrontmatter = {
  title?: string;
  slug?: string;
  publishedAt?: string;
  tags?: Array<string>;
  cover?: string;
  externalUrl?: string;
};

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const SCALAR_RE = /^([A-Za-z][\w-]*):\s*(.*)$/;
const LIST_ITEM_RE = /^\s+-\s+(.+)$/;
const LOCAL_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/g;
const LOCAL_SRC_RE = /\bsrc:\s*['"]([^'"]+)['"]/g;
const REMOTE_URL_RE = /^(?:https?:)?\/\//;
const EXTERNAL_URL_RE = /^https?:\/\/\S+$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_FIELDS = ['title', 'slug', 'publishedAt'] as const;

const rootDir = process.cwd();
const blogDir = join(rootDir, 'blog');

const createIssue = (file: string, message: string): BlogIssue => ({
  file: relative(rootDir, file),
  message,
});

const readArticleFiles = () => {
  if (!existsSync(blogDir)) return [];

  return readdirSync(blogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(blogDir, entry.name, 'index.mdx'))
    .filter(existsSync);
};

const readTagList = (lines: Array<string>, start: number) => {
  const tags: Array<string> = [];
  let index = start;

  while (index < lines.length) {
    const item = lines[index].match(LIST_ITEM_RE);
    if (!item) break;
    tags.push(item[1].trim());
    index += 1;
  }
  return { tags, nextIndex: index };
};

const assignFrontmatterValue = (
  frontmatter: BlogFrontmatter,
  key: string,
  value: string,
) => {
  if (key === 'title') frontmatter.title = value;
  if (key === 'slug') frontmatter.slug = value;
  if (key === 'publishedAt') frontmatter.publishedAt = value;
  if (key === 'cover') frontmatter.cover = value;
  if (key === 'externalUrl') frontmatter.externalUrl = value;
};

const parseFrontmatter = (source: string) => {
  const match = source.match(FRONTMATTER_RE);
  if (!match) return null;

  const frontmatter: BlogFrontmatter = {};
  const lines = match[1].split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const scalar = lines[index].match(SCALAR_RE);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    if (rawValue) {
      assignFrontmatterValue(frontmatter, key, rawValue.trim());
      continue;
    }
    if (key !== 'tags') continue;

    const tagList = readTagList(lines, index + 1);
    frontmatter.tags = tagList.tags;
    index = tagList.nextIndex - 1;
  }
  return frontmatter;
};

const normalizeAssetPath = (value: string) => {
  return value.trim().replace(/^<|>$/g, '').split(/\s+/)[0];
};

const isLocalAssetPath = (value: string) => {
  return (
    Boolean(value) &&
    !REMOTE_URL_RE.test(value) &&
    !/^(?:data|blob):/.test(value) &&
    !value.startsWith('/')
  );
};

const collectAssetPaths = (source: string) => {
  return [
    ...Array.from(source.matchAll(LOCAL_IMAGE_RE), (match) => match[1]),
    ...Array.from(source.matchAll(LOCAL_SRC_RE), (match) => match[1]),
  ];
};

const checkLocalAsset = (file: string, rawAssetPath: string) => {
  const assetPath = normalizeAssetPath(rawAssetPath);
  if (!isLocalAssetPath(assetPath)) return null;

  const resolvedPath = normalize(join(dirname(file), assetPath));
  if (existsSync(resolvedPath)) return null;
  return createIssue(file, `missing local asset: ${assetPath}`);
};

const compactIssues = (issues: Array<BlogIssue | null>) => {
  return issues.filter((issue): issue is BlogIssue => Boolean(issue));
};

const checkArticle = (
  file: string,
  slugToFiles: Map<string, Array<string>>,
) => {
  const source = readFileSync(file, 'utf8');
  const frontmatter = parseFrontmatter(source);
  const issues: Array<BlogIssue | null> = [];

  if (!frontmatter) {
    issues.push(createIssue(file, 'missing frontmatter block'));
    return compactIssues(issues);
  }

  for (const key of REQUIRED_FIELDS) {
    if (!frontmatter[key]) {
      issues.push(
        createIssue(file, `missing required frontmatter field: ${key}`),
      );
    }
  }
  if (!frontmatter.tags?.length) {
    issues.push(createIssue(file, 'missing required frontmatter field: tags'));
  }

  if (frontmatter.slug) {
    if (!SLUG_RE.test(frontmatter.slug)) {
      issues.push(createIssue(file, `invalid slug: ${frontmatter.slug}`));
    }
    const files = slugToFiles.get(frontmatter.slug) ?? [];
    files.push(file);
    slugToFiles.set(frontmatter.slug, files);
  }

  if (frontmatter.cover) {
    issues.push(checkLocalAsset(file, frontmatter.cover));
  }
  if (
    frontmatter.externalUrl &&
    !EXTERNAL_URL_RE.test(frontmatter.externalUrl)
  ) {
    issues.push(
      createIssue(file, `invalid externalUrl: ${frontmatter.externalUrl}`),
    );
  }
  for (const assetPath of collectAssetPaths(source)) {
    issues.push(checkLocalAsset(file, assetPath));
  }
  return compactIssues(issues);
};

const checkDuplicateSlugs = (slugToFiles: Map<string, Array<string>>) => {
  const issues: Array<BlogIssue> = [];

  for (const [slug, files] of slugToFiles) {
    if (files.length <= 1) continue;
    for (const file of files) {
      issues.push(createIssue(file, `duplicate slug: ${slug}`));
    }
  }
  return issues;
};

const printResult = (articleCount: number, issues: Array<BlogIssue>) => {
  if (!issues.length) {
    console.log(`Blog check passed: ${articleCount} article(s)`);
    return;
  }

  console.error('Blog check failed:');
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
};

const articleFiles = readArticleFiles();
const slugToFiles = new Map<string, Array<string>>();
const issues = articleFiles.flatMap((file) => checkArticle(file, slugToFiles));

printResult(articleFiles.length, [
  ...issues,
  ...checkDuplicateSlugs(slugToFiles),
]);
