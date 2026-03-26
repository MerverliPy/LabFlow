#!/usr/bin/env bash
set -euo pipefail

git add README.md RELEASE_READINESS.md docs/reference/identity.md tools/generate-docs.mjs packages/cli/src/index.mjs packages/proof-sdk/src/index.mjs docs/generated
git commit -m "docs(repo): remove truth drift and align generated docs"
