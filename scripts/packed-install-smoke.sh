#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="$REPO_ROOT/packages/cli"
INSTALL_ROOT="$(mktemp -d)"
WORKSPACE_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$INSTALL_ROOT" "$WORKSPACE_ROOT"
}

trap cleanup EXIT

find "$PACKAGE_DIR" -maxdepth 1 -name '*.tgz' -delete

(
  cd "$REPO_ROOT"
  pnpm --dir packages/cli pack >/dev/null
)

TARBALL="$(ls -1t "$PACKAGE_DIR"/*.tgz | head -n 1)"

if [[ -z "${TARBALL:-}" || ! -f "$TARBALL" ]]; then
  echo "Packed-install smoke test failed: no CLI tarball was produced." >&2
  exit 1
fi

(
  cd "$INSTALL_ROOT"
  npm init -y >/dev/null 2>&1
  npm install "$TARBALL" >/dev/null 2>&1
  ./node_modules/.bin/labflow --help >/dev/null
  ./node_modules/.bin/labflow doctor --json > doctor.json
  node - <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('doctor.json', 'utf8'));
if (payload.product?.productName !== 'LabFlow') {
  throw new Error('doctor productName drift in packed install');
}
if (payload.product?.cliName !== 'labflow') {
  throw new Error('doctor cliName drift in packed install');
}
NODE
)

(
  cd "$WORKSPACE_ROOT"
  "$INSTALL_ROOT/node_modules/.bin/labflow" init --json >/dev/null
  "$INSTALL_ROOT/node_modules/.bin/labflow" status --json > status.json
  node - <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('status.json', 'utf8'));
if (payload.initialized !== true) {
  throw new Error('packed install should initialize workspace successfully');
}
if (payload.product !== 'LabFlow') {
  throw new Error('packed install status product drift');
}
NODE
)

echo "Packed-install smoke test passed: $TARBALL"
