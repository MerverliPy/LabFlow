#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'config/stable-command-manifest.json'), 'utf8'));
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
  process.exit(0);
}
if (!manifest.stableCommands.includes(command)) {
  console.error(`Unknown or non-stable command: ${command}`);
  process.exit(1);
}
console.log(`Scaffold only: implement '${command}' behavior in Phase 2.`);
