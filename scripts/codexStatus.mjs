import { spawnSync } from 'node:child_process';

const runGit = (args) => {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
};

const status = runGit(['status', '--short']);
const branch = runGit(['branch', '--show-current']);
const latestCommit = runGit(['log', '-1', '--oneline']);

console.log(`branch: ${branch || '(detached)'}`);
console.log(`latest: ${latestCommit || '(none)'}`);
console.log('');

if (!status) {
  console.log('working tree: clean');
} else {
  console.log('working tree:');
  console.log(status);
}
