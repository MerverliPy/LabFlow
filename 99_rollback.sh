#!/usr/bin/env bash
set -euo pipefail

git reset --hard HEAD
git clean -fd
pnpm install
