#!/usr/bin/env bash
set -euo pipefail

git fetch origin
git checkout main-safe-runtime-fix
git pull --ff-only origin main-safe-runtime-fix

merge_failed=0
if ! git merge --no-ff origin/main; then
  merge_failed=1
fi

if [ "$merge_failed" -eq 1 ]; then
  unresolved="$(git diff --name-only --diff-filter=U || true)"

  if [ "$unresolved" = "site/styles.css" ]; then
    echo "Resolving site/styles.css by keeping PR branch version"
    git checkout --ours site/styles.css
    git add site/styles.css
    git commit -m "merge: resolve site/styles.css conflict while syncing main"
  else
    echo "Unexpected unresolved conflicts:"
    echo "$unresolved"
    exit 1
  fi
fi

pnpm build
pnpm test
pnpm proof:verify

git push origin main-safe-runtime-fix

echo
echo "Done. Refresh PR #9 in GitHub."
