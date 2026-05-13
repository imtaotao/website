const path = require('node:path');
const { spawnSync } = require('node:child_process');

exports.run = (file) => {
  const entry = path.resolve(__dirname, `../src/${file}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

