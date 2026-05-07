import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  console.log(`$ ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('pnpm', ['codex:blog-check']);
run('pnpm', ['build']);
