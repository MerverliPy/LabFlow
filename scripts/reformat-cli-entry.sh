#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"

node <<'EOF_NODE'
const fs = require('fs');
const path = 'packages/cli/src/index.mjs';

if (!fs.existsSync(path)) {
  console.error(`Missing file: ${path}`);
  process.exit(1);
}

let out = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

out = out
  .replace(/;/g, ';\n')
  .replace(/\{\s*/g, '{\n')
  .replace(/\s*\}/g, '\n}\n')
  .replace(/,\s*/g, ', ')
  .replace(/\n{3,}/g, '\n\n');

const lines = out.split('\n');
let indent = 0;
const formatted = [];

for (const raw of lines) {
  const line = raw.trim();

  if (!line) {
    formatted.push('');
    continue;
  }

  if (/^[}\])]/.test(line)) {
    indent = Math.max(0, indent - 1);
  }

  formatted.push('  '.repeat(indent) + line);

  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  indent += opens - closes;
  if (indent < 0) indent = 0;
}

fs.writeFileSync(path, formatted.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log(`Reformatted: ${path}`);
EOF_NODE
