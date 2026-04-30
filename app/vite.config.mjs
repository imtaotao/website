import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { parse as parseYaml } from 'yaml';
import mdx from '@mdx-js/rollup';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resolveResumeJson = () => {
  const yamlPath = resolve(__dirname, '../resume.yaml');
  if (!existsSync(yamlPath)) {
    throw new Error(
      `Missing resume.yaml at repo root: ${yamlPath}. Please ensure the file exists.`,
    );
  }

  const yamlText = readFileSync(yamlPath, 'utf8');
  const data = parseYaml(yamlText);
  return JSON.stringify(data);
};

const RESUME_JSON = resolveResumeJson();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
    }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  define: {
    __RESUME_JSON__: JSON.stringify(RESUME_JSON),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        404: resolve(__dirname, '404.html'),
      },
    },
  },
});
