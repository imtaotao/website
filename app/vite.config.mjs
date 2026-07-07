import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  statSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  copyFileSync,
} from 'node:fs';

import { defineConfig } from 'vite';
import { parse as parseYaml } from 'yaml';
import { aukletStylePlugin } from 'auklet';
import tsconfigPaths from 'vite-tsconfig-paths';

import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resumeYamlPath = resolve(__dirname, '../resume.yaml');
const blogDir = resolve(__dirname, '../blog');

const resolveResumeJson = () => {
  if (!existsSync(resumeYamlPath)) {
    throw new Error(
      `Missing resume.yaml at repo root: ${resumeYamlPath}. ` +
        `Please ensure the file exists.`,
    );
  }
  return JSON.stringify(parseYaml(readFileSync(resumeYamlPath, 'utf8')));
};

const resumeYamlPlugin = () => {
  const virtualModuleId = 'virtual:resume-json';
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;

  return {
    name: 'website-resume-yaml',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
      return null;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return null;
      this.addWatchFile(resumeYamlPath);
      return `export default ${JSON.stringify(resolveResumeJson())};`;
    },
  };
};

const encodeCodeMeta = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_{}.,-]+/g, '_');
};

const remarkCodeMetaClassName = () => {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'code' && node.lang && node.meta) {
        node.lang = `${node.lang}--meta-${encodeCodeMeta(node.meta)}`;
      }
      if (!Array.isArray(node.children)) return;
      for (const child of node.children) {
        visit(child);
      }
    };
    visit(tree);
  };
};

const readMdxFrontmatter = (filePath) => {
  const source = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;

  const endIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === '---',
  );
  if (endIndex < 0) return null;
  return parseYaml(lines.slice(1, endIndex).join('\n'));
};

const getBlogRoutePaths = () => {
  if (!existsSync(blogDir)) return [];

  const articleFiles = readdirSync(blogDir)
    .flatMap((entry) => {
      const entryPath = resolve(blogDir, entry);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) return [resolve(entryPath, 'index.mdx')];
      if (stat.isFile() && entry.endsWith('.mdx')) return [entryPath];
      return [];
    })
    .filter((filePath) => existsSync(filePath));

  return articleFiles
    .map((filePath) => readMdxFrontmatter(filePath)?.slug)
    .filter((slug) => typeof slug === 'string' && slug.trim())
    .map((slug) => `blog/${slug.trim()}`);
};

const spaRouteFallbackPlugin = () => {
  let outDir = resolve(__dirname, 'dist');

  return {
    name: 'website-spa-route-fallback',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexHtmlPath = resolve(outDir, 'index.html');
      if (!existsSync(indexHtmlPath)) return;

      const routePaths = Array.from(
        new Set(['blog', 'resume', ...getBlogRoutePaths()]),
      );

      for (const routePath of routePaths) {
        const routeDir = resolve(outDir, routePath);
        mkdirSync(routeDir, { recursive: true });
        copyFileSync(indexHtmlPath, resolve(routeDir, 'index.html'));
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api/dictionary/youdao': {
        target: 'https://dict.youdao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dictionary\/youdao/, ''),
      },
    },
  },
  resolve: {
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      '@mdx-js/react': resolve(__dirname, 'node_modules/@mdx-js/react'),
      'react/jsx-runtime': resolve(
        __dirname,
        'node_modules/react/jsx-runtime.js',
      ),
      'react/jsx-dev-runtime': resolve(
        __dirname,
        'node_modules/react/jsx-dev-runtime.js',
      ),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        404: resolve(__dirname, '404.html'),
      },
    },
  },
  plugins: [
    resumeYamlPlugin(),
    mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        remarkMdxFrontmatter,
        remarkCodeMetaClassName,
      ],
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    aukletStylePlugin({ mode: 'monorepo' }),
    spaRouteFallbackPlugin(),
  ],
});
