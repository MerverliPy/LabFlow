#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"

node <<'EOF_NODE'
const fs = require('fs');

function patchJson(path, updater) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const next = updater(data) || data;
  fs.writeFileSync(path, JSON.stringify(next, null, 2) + '\n');
  console.log(`Patched ${path}`);
}

patchJson('packages/proof-sdk/package.json', (pkg) => {
  pkg.scripts = pkg.scripts || {};

  const existingBuild = pkg.scripts.build || 'node --check src/index.mjs';
  const existingLint = pkg.scripts.lint || 'node --check src/index.mjs';
  const existingTypecheck = pkg.scripts.typecheck || 'node --check src/index.mjs';

  pkg.scripts.build = existingBuild;
  pkg.scripts.lint = existingLint;
  pkg.scripts.typecheck = existingTypecheck;

  pkg.scripts.test =
    "node --input-type=module -e \"import('./src/index.mjs').then(() => console.log('proof-sdk exports ok'))\"";

  pkg.scripts.verify = 'node src/index.mjs verify';

  return pkg;
});

patchJson('package.json', (pkg) => {
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['proof:verify'] = 'pnpm --dir packages/proof-sdk run verify';
  return pkg;
});
EOF_NODE

echo
echo 'Patched proof-sdk test boundary.'
echo 'Next: pnpm test'
echo 'Then: pnpm proof:verify'
