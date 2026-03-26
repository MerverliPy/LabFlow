#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = process.cwd();

const cliFile = fileURLToPath(import.meta.url);
const cliDir = dirname(cliFile);
const packageRoot = resolve(cliDir, '../../..');

const manifestPath = resolve(packageRoot, 'config/stable-command-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === 'help') {
  console.log('labflow <command>');
  console.log('');
  console.log('Stable commands:');
  for (const name of manifest.stableCommands) console.log(`- ${name}`);
  process.exit(0);
}

if (command === 'doctor') {
  console.log('LabFlow doctor');
  console.log('Expected identity: LabFlow / labflow / labflow');
  console.log(`Workspace: ${workspaceRoot}`);
  process.exit(0);
}

if (!manifest.stableCommands.includes(command)) {
  console.error(`Unknown or non-stable command: ${command}`);
  process.exit(1);
}

console.log(`Scaffold only: implement '${command}' behavior in Phase 2.`);
