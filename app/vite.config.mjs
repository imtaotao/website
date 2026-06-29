import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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
  ],
});
