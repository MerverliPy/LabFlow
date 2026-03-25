import fs from 'node:fs';
import path from 'node:path';
import { buildGeneratedDocs } from './generate-docs.mjs';

const root = process.cwd();
const expected = buildGeneratedDocs(root);

for (const [filename, content] of Object.entries(expected)) {
  const target = path.join(root, 'docs', 'generated', filename);
  if (!fs.existsSync(target)) {
    console.error(`generated docs missing: docs/generated/${filename}`);
    process.exit(1);
  }

  const actual = fs.readFileSync(target, 'utf8');
  if (actual !== `${content}\n`) {
    console.error(`generated docs drift: docs/generated/${filename}`);
    process.exit(1);
  }
}

console.log('generated docs are current');
