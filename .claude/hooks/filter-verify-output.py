#!/usr/bin/env python3
import json
import re
import shlex
import sys

try:
    payload = json.load(sys.stdin)
except Exception:
    print("{}")
    raise SystemExit(0)

tool_name = payload.get("tool_name", "")
tool_input = payload.get("tool_input") or {}
command = (tool_input.get("command") or "").strip()

if tool_name != "Bash" or not command:
    print("{}")
    raise SystemExit(0)

verification_patterns = [
    r"(^|[;&|]\s*)(npm|pnpm|yarn)\s+(test|run\s+(test|build|typecheck|lint|verify))(\s|$)",
    r"(^|[;&|]\s*)node\s+--test(\s|$)",
    r"(^|[;&|]\s*)node\s+--check(\s|$)",
    r"(^|[;&|]\s*)vite\s+build(\s|$)",
    r"claude-code-pack/install/audit-pack\.sh",
    r"tools/validate-manifest\.mjs"
]

if not any(re.search(pattern, command) for pattern in verification_patterns):
    print("{}")
    raise SystemExit(0)

filter_cmd = 'python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/stream-failures.py'
rewritten = "bash -lc " + shlex.quote(
    f"set -o pipefail; ({command}) 2>&1 | {filter_cmd}; rc=${{PIPESTATUS[0]}}; exit $rc"
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "updatedInput": {
            "command": rewritten
        }
    }
}))
