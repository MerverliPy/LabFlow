#!/usr/bin/env bash
set -euo pipefail
max_lines=40
actual_lines=$(wc -l < CLAUDE.md)
if [ "$actual_lines" -gt "$max_lines" ]; then
  echo "Warning: root CLAUDE.md exceeds $max_lines lines"
  exit 1
fi
echo "context budget OK"
