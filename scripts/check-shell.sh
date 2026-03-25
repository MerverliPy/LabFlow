#!/usr/bin/env bash
set -euo pipefail
bash -n scripts/doctor-identity-check.sh
bash -n scripts/context-budget-check.sh
bash -n scripts/worktree-review.sh
bash -n scripts/worktree-verify.sh
echo "shell syntax checks passed"
