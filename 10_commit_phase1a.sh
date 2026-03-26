#!/usr/bin/env bash
set -euo pipefail

git add packages/memory/src/store.mjs packages/memory/package.json packages/memory/test/store.test.mjs
git commit -m "fix(memory): harden state ids and validation tests"
