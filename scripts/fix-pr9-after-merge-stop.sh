#!/usr/bin/env bash
set -euo pipefail

git fetch origin
git checkout main-safe-runtime-fix
git pull --ff-only origin main-safe-runtime-fix

echo "Aligning site assets with main..."
git checkout origin/main -- site/styles.css site/index.html

if ! git diff --quiet -- site/styles.css site/index.html; then
  git add site/styles.css site/index.html
  git commit -m "merge: align site assets with main after conflict resolution"
else
  echo "Site assets already match origin/main"
fi

echo
echo "Package identity and scripts:"
node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('name:', pkg.name);
console.log('scripts:', Object.keys(pkg.scripts || {}).join(', '));
NODE

echo
echo "Running pnpm test..."
if ! pnpm test 2>&1 | tee /tmp/pr9-pnpm-test.log; then
  echo
  echo "pnpm test failed"
  echo "Saved log: /tmp/pr9-pnpm-test.log"
  exit 11
fi

echo
echo "Running pnpm proof:verify..."
if ! pnpm proof:verify 2>&1 | tee /tmp/pr9-proof-verify.log; then
  echo
  echo "pnpm proof:verify failed"
  echo "Saved log: /tmp/pr9-proof-verify.log"
  exit 12
fi

echo
echo "Pushing updated PR branch..."
git push origin main-safe-runtime-fix

echo
echo "Done. Refresh PR #9."
