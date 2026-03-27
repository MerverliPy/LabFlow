#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"

FILE="packages/cli/src/index.mjs"

if [ ! -f "$FILE" ]; then
  echo "Missing file: $FILE" >&2
  exit 1
fi

BACKUP="${FILE}.bak.$(date +%Y%m%d%H%M%S)"
cp -f "$FILE" "$BACKUP"
echo "Backup written: $BACKUP"

python3 <<'PY'
from pathlib import Path
import re
import sys

p = Path("packages/cli/src/index.mjs")
text = p.read_text()

patterns = [
    (r'("privatePackage"\s*:\s*)[^,\n}]+', r'\1false'),
    (r"(privatePackage\s*:\s*)[^,\n}]+", r"\1false"),
]

new = text
patched = 0

for pattern, repl in patterns:
    new2, count = re.subn(pattern, repl, new, count=1)
    if count:
        new = new2
        patched = count
        break

if not patched:
    sys.stderr.write("Could not find a privatePackage field to patch in packages/cli/src/index.mjs\n")
    sys.exit(1)

p.write_text(new)
print("Patched privatePackage -> false in packages/cli/src/index.mjs")
PY

node --check "$FILE"

echo
echo "Doctor field patched successfully."
echo "Next:"
echo "  node packages/cli/src/index.mjs doctor --json"
echo "  pnpm proof:verify"
