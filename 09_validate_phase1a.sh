#!/usr/bin/env bash
set -euo pipefail

pnpm install
pnpm build
pnpm test
pnpm proof:verify
git diff -- packages/memory
