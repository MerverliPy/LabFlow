#!/usr/bin/env bash
set -euo pipefail

pnpm validate:manifest
pnpm verify:generated-docs
pnpm build
pnpm test
pnpm proof:verify
git diff -- README.md RELEASE_READINESS.md docs/reference/identity.md tools/generate-docs.mjs packages/cli/src/index.mjs packages/proof-sdk/src/index.mjs docs/generated
