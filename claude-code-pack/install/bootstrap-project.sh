#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/target-repo [--force]" >&2
  exit 1
fi

TARGET_DIR="$1"
FORCE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_ROOT="${PACK_ROOT}/project-template"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "Target directory does not exist: ${TARGET_DIR}" >&2
  exit 1
fi

copy_file() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "${dst}")"
  if [ -e "${dst}" ] && [ "${FORCE}" != "--force" ]; then
    echo "skip ${dst} (exists)"
    return
  fi
  cp "${src}" "${dst}"
  echo "write ${dst}"
}

while IFS= read -r -d '' src; do
  rel="${src#${TEMPLATE_ROOT}/}"
  dst="${TARGET_DIR}/${rel}"
  copy_file "${src}" "${dst}"
done < <(find "${TEMPLATE_ROOT}" -type f -print0)

echo "Bootstrapped Claude Code project files into ${TARGET_DIR}"
