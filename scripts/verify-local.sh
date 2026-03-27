#!/usr/bin/env bash
set -euo pipefail

if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

pnpm format:check
pnpm lint
pnpm test
pnpm build
