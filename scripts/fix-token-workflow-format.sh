#!/usr/bin/env bash
set -euo pipefail

pnpm exec prettier --write docs/reference/token-workflow.md
pnpm format:check
git add docs/reference/token-workflow.md
git commit -m "chore: format token workflow doc"
git push origin main
