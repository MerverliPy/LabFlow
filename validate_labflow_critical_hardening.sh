#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd)"

if [[ ! -f "$REPO_ROOT/package.json" || ! -d "$REPO_ROOT/packages/cli" ]]; then
  echo "Run this script from the LabFlow repository root." >&2
  exit 1
fi

corepack enable

if [[ -f pnpm-lock.yaml ]]; then
  if ! pnpm install --frozen-lockfile; then
    echo
    echo "Lockfile is stale. Refreshing it with --no-frozen-lockfile ..."
    pnpm install --no-frozen-lockfile
  fi
else
  pnpm install
fi

pnpm format
pnpm verify
bash scripts/packed-install-smoke.sh

echo
echo "Validation succeeded."
echo "Recommended next commands:"
echo "  git status"
echo "  git add pnpm-lock.yaml package.json packages/cli packages/memory scripts .github/workflows"
echo '  git commit -m "fix: harden packaging, state validation, and release gates"'
