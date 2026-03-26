#!/usr/bin/env bash
set -euo pipefail

pnpm install
pnpm validate:manifest
pnpm generate:docs
pnpm verify:generated-docs
pnpm build
pnpm test
pnpm proof:verify
pnpm check:shell
pnpm release:readiness
