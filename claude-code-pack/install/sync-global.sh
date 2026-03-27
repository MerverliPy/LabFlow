#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
GLOBAL_ROOT="${PACK_ROOT}/global"
TARGET_ROOT="${HOME}/.claude"

mkdir -p "${TARGET_ROOT}/skills" "${TARGET_ROOT}/agents"

copy_dir() {
  local src="$1"
  local dst="$2"
  mkdir -p "${dst}"
  for item in "${src}"/*; do
    [ -e "${item}" ] || continue
    local name
    name="$(basename "${item}")"
    rm -rf "${dst}/${name}"
    cp -R "${item}" "${dst}/${name}"
  done
}

copy_dir "${GLOBAL_ROOT}/skills" "${TARGET_ROOT}/skills"
copy_dir "${GLOBAL_ROOT}/agents" "${TARGET_ROOT}/agents"

echo "Synced global Claude Code assets to ${TARGET_ROOT}"
