import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const rootDir = process.cwd();
const blogDir = join(rootDir, 'blog');
const issues = [];

const addIssue = (file, message) => {
  issues.push({ file: relative(rootDir, file), message });
};

const readArticleFiles = () => {
  if (!existsSync(blogDir)) return [];

  return readdirSync(blogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(blogDir, entry.name, 'index.mdx'))
    .filter((file) => existsSync(file));
};

const parseFrontmatter = (file, source) => {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    addIssue(file, 'missing frontmatter block');
    return {};
  }

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    if (rawValue) {
      frontmatter[key] = rawValue.trim();
      continue;
    }

    if (key !== 'tags') continue;

    const tags = [];
    let nextIndex = index + 1;
    while (nextIndex < lines.length) {
      const item = lines[nextIndex].match(/^\s+-\s+(.+)$/);
      if (!item) break;
      tags.push(item[1].trim());
      nextIndex += 1;
    }

    frontmatter.tags = tags;
    index = nextIndex - 1;
  }

  return frontmatter;
};

const isLocalAssetPath = (value) => {
  return (
    value &&
    !/^(?:https?:)?\/\//.test(value) &&
    !/^(?:data|blob):/.test(value) &&
    !value.startsWith('/')
  );
};

const normalizeAssetPath = (value) => {
  return value.trim().replace(/^<|>$/g, '').split(/\s+/)[0];
};

const checkLocalAsset = (file, rawAssetPath) => {
  const assetPath = normalizeAssetPath(rawAssetPath);
  if (!isLocalAssetPath(assetPath)) return;

  const resolvedPath = normalize(join(dirname(file), assetPath));
  if (!existsSync(resolvedPath)) {
    addIssue(file, `missing local asset: ${assetPath}`);
  }
};

const articleFiles = readArticleFiles();
const slugToFiles = new Map();

for (const file of articleFiles) {
  const source = readFileSync(file, 'utf8');
  const frontmatter = parseFrontmatter(file, source);

  for (const key of ['title', 'slug', 'publishedAt', 'updatedAt']) {
    if (!frontmatter[key]) {
      addIssue(file, `missing required frontmatter field: ${key}`);
    }
  }

  if (!frontmatter.tags?.length) {
    addIssue(file, 'missing required frontmatter field: tags');
  }

  if (frontmatter.slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.slug)) {
      addIssue(file, `invalid slug: ${frontmatter.slug}`);
    }

    const files = slugToFiles.get(frontmatter.slug) ?? [];
    files.push(file);
    slugToFiles.set(frontmatter.slug, files);
  }

  if (frontmatter.cover) {
    checkLocalAsset(file, frontmatter.cover);
  }

  for (const match of source.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    checkLocalAsset(file, match[1]);
  }

  for (const match of source.matchAll(/\bsrc:\s*['"]([^'"]+)['"]/g)) {
    checkLocalAsset(file, match[1]);
  }
}

for (const [slug, files] of slugToFiles) {
  if (files.length <= 1) continue;

  for (const file of files) {
    addIssue(file, `duplicate slug: ${slug}`);
  }
}

if (issues.length > 0) {
  console.error('Blog check failed:');
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`Blog check passed: ${articleFiles.length} article(s)`);
