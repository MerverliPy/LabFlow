#!/usr/bin/env bash
set -euo pipefail
echo "LabFlow doctor: identity checks"
if command -v ruflo >/dev/null 2>&1; then
  echo "Hard warning: old binary detected: ruflo"
  echo "Remove it with: npm uninstall -g ruflo || pnpm remove -g ruflo"
fi
if command -v claude-flow >/dev/null 2>&1; then
  echo "Hard warning: old binary detected: claude-flow"
  echo "Remove it with: npm uninstall -g claude-flow || pnpm remove -g claude-flow"
fi
echo "Expected package name: labflow"
echo "Expected CLI name: labflow"
