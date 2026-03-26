#!/usr/bin/env bash
set -euo pipefail

git add .github/workflows/ci.yml CONTRIBUTING.md
git commit -m "ci(repo): add multi-os checks and contributor guardrails"
