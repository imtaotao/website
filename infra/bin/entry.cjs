#!/usr/bin/env node

const path = require('node:path');
const minimist = require('minimist');

const commands = {
  'build-css': 'css/builder.ts',
};

const run = async (file, args) => {
  const { execa } = await import('execa');
  const entry = path.resolve(__dirname, `../src/${file}`);
  const result = await execa(process.execPath, ['--import', 'tsx', entry, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    reject: false,
  });
  process.exit(result.exitCode ?? 1);
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
  console.log('  build-css  Build package module CSS output, supports --watch');
  process.exit(argv.help ? 0 : 1);
}

const file = commands[command];

if (!file) {
  console.error(`Unknown infra command: ${command}`);
  process.exit(1);
}

run(file, commandArgs).catch((error) => {
  console.error(error);
  process.exit(1);
});
