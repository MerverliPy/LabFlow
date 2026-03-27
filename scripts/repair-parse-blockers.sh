#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"

mkdir -p apps/www

echo '==> Restoring CLI entrypoint from HEAD'
git show HEAD:packages/cli/src/index.mjs > packages/cli/src/index.mjs

echo '==> Restoring website files from HEAD root into apps/www'
for f in index.html main.js styles.css vite.config.js; do
  if git cat-file -e "HEAD:$f" 2>/dev/null; then
    git show "HEAD:$f" > "apps/www/$f"
    echo "restored apps/www/$f from HEAD:$f"
  else
    echo "skip: HEAD:$f not found"
  fi
done

echo '==> Scanning for leftover merge markers'
git grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- . || true

echo
echo 'Parse-blocker repair complete.'
echo 'Next: pnpm format'
echo 'Then: bash scripts/verify-local.sh'
