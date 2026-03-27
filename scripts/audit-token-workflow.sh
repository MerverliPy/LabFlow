#!/usr/bin/env bash
set -u -o pipefail

ROOT="${1:-.}"
cd "$ROOT" || exit 1

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

section() {
  printf '\n== %s ==\n' "$1"
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS %s\n' "$1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf 'WARN %s\n' "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL %s\n' "$1"
}

need_file() {
  local path="$1"
  if [ -f "$path" ]; then
    pass "file exists: $path"
  else
    fail "missing file: $path"
  fi
}

need_dir() {
  local path="$1"
  if [ -d "$path" ]; then
    pass "dir exists: $path"
  else
    fail "missing dir: $path"
  fi
}

contains_text() {
  local path="$1"
  local pattern="$2"
  local label="$3"
  if [ ! -f "$path" ]; then
    fail "missing file for text check: $path"
    return
  fi
  if grep -qi "$pattern" "$path"; then
    pass "$label"
  else
    fail "$label"
  fi
}

warn_if_exists() {
  local path="$1"
  local label="$2"
  if [ -e "$path" ]; then
    warn "$label: $path"
  else
    pass "not present: $path"
  fi
}

fail_if_exists() {
  local path="$1"
  local label="$2"
  if [ -e "$path" ]; then
    fail "$label: $path"
  else
    pass "not present: $path"
  fi
}

section "repo layout"
need_file "CLAUDE.md"
need_file ".claude/settings.json"
need_file "STATE.md"
need_file "PHASE_HANDOFF.md"
need_file "known-issues.md"
need_file "decision-log.md"
need_file "docs/reference/token-workflow.md"

need_dir "plugins/labflow-claude-pack"
need_file "plugins/labflow-claude-pack/.claude-plugin/plugin.json"
need_file "plugins/labflow-claude-pack/hooks/hooks.json"
need_file "plugins/labflow-claude-pack/scripts/filter-verify-output.py"
need_file "plugins/labflow-claude-pack/scripts/stream-failures.py"

for skill in phase-plan phase-work phase-verify handoff; do
  need_file "plugins/labflow-claude-pack/skills/${skill}/SKILL.md"
done

for agent in repo-architect implementer verifier refactor-worktree; do
  need_file "plugins/labflow-claude-pack/agents/${agent}.md"
done

section "workflow text"
contains_text "CLAUDE.md" "Plan Mode" "CLAUDE.md mentions Plan Mode"
contains_text "CLAUDE.md" "STATE.md" "CLAUDE.md mentions STATE.md"
contains_text "CLAUDE.md" "PHASE_HANDOFF.md" "CLAUDE.md mentions PHASE_HANDOFF.md"
contains_text "CLAUDE.md" "/clear" "CLAUDE.md mentions /clear"
contains_text "CLAUDE.md" "phase-plan" "CLAUDE.md mentions phase-plan"
contains_text "CLAUDE.md" "phase-work" "CLAUDE.md mentions phase-work"
contains_text "CLAUDE.md" "phase-verify" "CLAUDE.md mentions phase-verify"
contains_text "CLAUDE.md" "handoff" "CLAUDE.md mentions handoff"

contains_text "docs/reference/token-workflow.md" "Plan Mode" "token-workflow.md mentions Plan Mode"
contains_text "docs/reference/token-workflow.md" "/labflow-claude-pack:phase-plan" "token-workflow.md mentions namespaced phase-plan"
contains_text "docs/reference/token-workflow.md" "/labflow-claude-pack:phase-work" "token-workflow.md mentions namespaced phase-work"
contains_text "docs/reference/token-workflow.md" "/labflow-claude-pack:phase-verify" "token-workflow.md mentions namespaced phase-verify"
contains_text "docs/reference/token-workflow.md" "/labflow-claude-pack:handoff" "token-workflow.md mentions namespaced handoff"
contains_text "docs/reference/token-workflow.md" "/clear" "token-workflow.md mentions /clear"
contains_text "docs/reference/token-workflow.md" "One phase per session" "token-workflow.md enforces one phase per session"

section "settings.json policy"
if [ -f ".claude/settings.json" ]; then
  while IFS='|' read -r level message; do
    case "$level" in
      PASS) pass "$message" ;;
      WARN) warn "$message" ;;
      FAIL) fail "$message" ;;
    esac
  done < <(python3 - <<'PY'
import json
from pathlib import Path

path = Path(".claude/settings.json")
data = json.loads(path.read_text())

model = data.get("model")
effort = data.get("effortLevel")
default_mode = ((data.get("permissions") or {}).get("defaultMode"))
enabled = data.get("enabledPlugins") or {}
hooks = data.get("hooks")

def out(level, msg):
    print(f"{level}|{msg}")

if model == "sonnet":
    out("PASS", "settings model is sonnet")
else:
    out("WARN", f"settings model is {model!r}, recommended 'sonnet'")

if effort == "medium":
    out("PASS", "settings effortLevel is medium")
else:
    out("WARN", f"settings effortLevel is {effort!r}, recommended 'medium'")

if default_mode == "plan":
    out("PASS", "permissions.defaultMode is plan")
else:
    out("FAIL", f"permissions.defaultMode is {default_mode!r}, expected 'plan'")

if enabled.get("typescript-lsp@claude-plugins-official") is True:
    out("PASS", "typescript-lsp official plugin enabled")
else:
    out("FAIL", "typescript-lsp official plugin not enabled")

if enabled.get("labflow-claude-pack@labflow-tools") is True:
    out("PASS", "labflow plugin enabled at project scope")
else:
    out("FAIL", "labflow plugin not enabled at project scope")

if hooks is None:
    out("PASS", "no duplicate local hooks block in .claude/settings.json")
else:
    out("FAIL", "duplicate local hooks block present in .claude/settings.json")
PY
)
fi

section "duplicate runtime sources"
for skill in phase-plan phase-work phase-verify handoff; do
  fail_if_exists ".claude/skills/${skill}/SKILL.md" "duplicate project skill present"
done

for agent in repo-architect implementer verifier refactor-worktree; do
  fail_if_exists ".claude/agents/${agent}.md" "duplicate project agent present"
done

fail_if_exists ".claude/hooks/filter-verify-output.py" "duplicate project hook present"
fail_if_exists ".claude/hooks/stream-failures.py" "duplicate project hook present"

HOME_CLAUDE="${HOME}/.claude"

for skill in phase-plan phase-work phase-verify handoff; do
  warn_if_exists "${HOME_CLAUDE}/skills/${skill}/SKILL.md" "duplicate home skill present"
done

for agent in repo-architect implementer verifier refactor-worktree; do
  warn_if_exists "${HOME_CLAUDE}/agents/${agent}.md" "duplicate home agent present"
done

warn_if_exists "${HOME_CLAUDE}/commands/phase-plan.md" "duplicate home command present"
warn_if_exists "${HOME_CLAUDE}/commands/phase-work.md" "duplicate home command present"
warn_if_exists "${HOME_CLAUDE}/commands/phase-verify.md" "duplicate home command present"
warn_if_exists "${HOME_CLAUDE}/commands/handoff.md" "duplicate home command present"

section "memory hygiene"
if [ -d ".claude/agent-memory" ]; then
  found_memory=0
  while IFS= read -r memory_file; do
    found_memory=1
    bytes=$(wc -c < "$memory_file" | tr -d ' ')
    lines=$(wc -l < "$memory_file" | tr -d ' ')
    if [ "$bytes" -le 25600 ]; then
      pass "memory size ok: ${memory_file} (${bytes} bytes)"
    else
      fail "memory too large: ${memory_file} (${bytes} bytes > 25600)"
    fi
    if [ "$lines" -le 200 ]; then
      pass "memory line count ok: ${memory_file} (${lines} lines)"
    else
      fail "memory too long: ${memory_file} (${lines} lines > 200)"
    fi
  done < <(find .claude/agent-memory -type f -name 'MEMORY.md' | sort)

  if [ "$found_memory" -eq 0 ]; then
    warn "no MEMORY.md files found under .claude/agent-memory"
  fi
else
  warn "no .claude/agent-memory directory present"
fi

section "git hygiene"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files | grep -Eq '(^|/)(__pycache__/|.*\.pyc$)'; then
    fail "tracked Python cache artifacts found in git"
  else
    pass "no tracked Python cache artifacts"
  fi

  if git ls-files | grep -Eq '^\.claude/_archive-duplicates-'; then
    fail "tracked archive duplicate folders found in git"
  else
    pass "no tracked duplicate archive folders"
  fi
else
  warn "git not available or repo not a git work tree; skipped tracked-file checks"
fi

section "plugin manifests"
if command -v claude >/dev/null 2>&1; then
  if claude plugin validate . >/dev/null 2>&1; then
    pass "root marketplace/plugin validation passed"
  else
    fail "root marketplace/plugin validation failed"
  fi

  if (cd plugins/labflow-claude-pack && claude plugin validate . >/dev/null 2>&1); then
    pass "plugin directory validation passed"
  else
    fail "plugin directory validation failed"
  fi
else
  warn "claude CLI not available; skipped plugin validation"
fi

section "summary"
printf 'PASS: %s\n' "$PASS_COUNT"
printf 'WARN: %s\n' "$WARN_COUNT"
printf 'FAIL: %s\n' "$FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo
  echo "RESULT: FAIL"
  exit 1
fi

echo
echo "RESULT: PASS"
