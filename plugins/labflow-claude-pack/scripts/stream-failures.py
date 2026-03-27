#!/usr/bin/env python3
import re
import sys

lines = sys.stdin.read().splitlines()

interesting = re.compile(
    r"(FAIL|ERROR|ERR!|TypeError|ReferenceError|SyntaxError|AssertionError|Cannot find|not found|MODULE_NOT_FOUND|Unhandled|Traceback|Failed)",
    re.IGNORECASE,
)

kept = []
context_after = 4
i = 0

while i < len(lines) and len(kept) < 240:
    if interesting.search(lines[i]):
        kept.extend(lines[i:i + context_after + 1])
        i += context_after + 1
    else:
        i += 1

seen = set()
deduped = []
for line in kept:
    if line not in seen:
        deduped.append(line)
        seen.add(line)

selected = deduped[-120:] if deduped else lines[-40:]

if selected:
    sys.stdout.write("\n".join(selected) + "\n")
