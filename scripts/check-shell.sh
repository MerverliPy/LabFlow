#!/usr/bin/env bash
set -euo pipefail

bash -n scripts/doctor-identity-check.sh
bash -n scripts/context-budget-check.sh

echo "shell syntax checks passed"
