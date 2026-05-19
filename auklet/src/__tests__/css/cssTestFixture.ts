import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type CssTestFixture = {
  root: string;
  writeFile: (relativePath: string, content: string) => string;
  readFile: (relativePath: string) => string;
  listFiles: (relativePath: string) => Array<string>;
  exists: (relativePath: string) => boolean;
  cleanup: () => void;
};

export const createCssTestFixture = (prefix: string) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  const writeFile = (relativePath: string, content: string) => {
    const file = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  const readFile = (relativePath: string) => {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
  };

  const listFiles = (relativePath: string) => {
    const targetRoot = path.join(root, relativePath);
    const files: Array<string> = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(file);
          continue;
        }
        files.push(path.relative(targetRoot, file).split(path.sep).join('/'));
      }
    };

    walk(targetRoot);
    return files.sort();
  };

  const exists = (relativePath: string) => {
    return fs.existsSync(path.join(root, relativePath));
  };

  const cleanup = () => {
    fs.rmSync(root, { recursive: true, force: true });
  };

  return {
    root,
    writeFile,
    readFile,
    listFiles,
    exists,
    cleanup,
  } satisfies CssTestFixture;
};
