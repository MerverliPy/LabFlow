import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const distDir = path.join(packageRoot, 'dist');
const configDir = path.join(packageRoot, 'config');

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(packageRoot, 'src', 'index.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: path.join(distDir, 'index.mjs')
});

await fs.mkdir(configDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, 'config', 'stable-command-manifest.json'),
  path.join(configDir, 'stable-command-manifest.json')
);
