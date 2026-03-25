import fs from 'node:fs';
import path from 'node:path';
const stateDir = path.join(process.cwd(), '.labflow');
export function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
  return stateDir;
}
if (process.argv[1] && process.argv[1].endsWith('store.mjs')) {
  ensureStateDir();
  console.log('memory scaffolding ready');
}
