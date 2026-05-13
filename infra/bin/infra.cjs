#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const minimist = require('minimist');

const commands = {
  'build-css': 'buildModuleCss.ts',
};

const run = (file, args) => {
  const entry = path.resolve(__dirname, `../src/${file}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', entry, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
};

const argv = minimist(process.argv.slice(2), {
  boolean: ['help'],
  alias: {
    h: 'help',
  },
});
const [command, ...args] = argv._;
const commandIndex = process.argv.indexOf(command);
const commandArgs = commandIndex >= 0 ? process.argv.slice(commandIndex + 1) : args;

if (argv.help || !command) {
  console.log('Usage: infra <command>');
  console.log('');
  console.log('Commands:');
  console.log('  build-css  Build package module CSS output');
  process.exit(argv.help ? 0 : 1);
}

const file = commands[command];

if (!file) {
  console.error(`Unknown infra command: ${command}`);
  process.exit(1);
}

run(file, commandArgs);
