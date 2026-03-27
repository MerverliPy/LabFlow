#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
MODE="${2:-}"
cd "$ROOT" || exit 1

STAMP="$(date +%Y%m%d-%H%M%S)"
PROJECT_ARCHIVE=".claude/_archive-duplicates-${STAMP}"
HOME_ARCHIVE="$HOME/.claude/_archive-duplicates-${STAMP}"

say() {
  printf '%s\n' "${1:-}"
}

archive_if_exists() {
  local src="${1:-}"
  local dest="${2:-}"
  if [ -n "$src" ] && [ -n "$dest" ] && [ -e "$src" ]; then
    mkdir -p "$(dirname "$dest")"
    mv "$src" "$dest"
    say "archived: $src -> $dest"
  fi
}

ensure_file() {
  local path="${1:-}"
  local content="${2:-}"
  if [ -z "$path" ]; then
    return 1
  fi
  if [ ! -f "$path" ]; then
    mkdir -p "$(dirname "$path")"
    printf '%s' "$content" > "$path"
    say "created: $path"
  else
    say "exists:   $path"
  fi
}

say "== ensure required directories =="
mkdir -p .claude docs/reference .claude/agent-memory

say
say "== ensure truth files =="
ensure_file "STATE.md" "# State

- Current phase:
- Status:
- Blocker:
- Next exact step:
- Last verification:
"
ensure_file "PHASE_HANDOFF.md" "# Phase Handoff

- Objective:
- Changed files:
- Verification:
- Blockers:
- Next exact step:
- Resume command:
"
ensure_file "known-issues.md" "# Known Issues

- None recorded.
"
ensure_file "decision-log.md" "# Decision Log

## Active decisions
"
ensure_file "docs/reference/token-workflow.md" "# Token Workflow

## Default loop

For any non-trivial task:

1. Start in Plan Mode.
2. Run \`/labflow-claude-pack:phase-plan\`.
3. Approve one small phase only.
4. Run \`/labflow-claude-pack:phase-work\`.
5. Run \`/labflow-claude-pack:phase-verify\`.
6. Run \`/labflow-claude-pack:handoff\`.
7. Run \`/clear\`.

## Rules

- One phase per session by default.
- Clear between unrelated tasks.
- Prefer fresh sessions over long-lived chats.
- Use the smallest verification command first.
- Keep \`STATE.md\` and \`PHASE_HANDOFF.md\` short and current.
- Keep \`MEMORY.md\` small and curated.

## When to skip planning

You may skip Plan Mode only for:
- obvious one-file fixes
- trivial docs edits
- narrow typo or config changes

## When to use isolated agents

Use:
- \`repo-architect\` for structure and boundary decisions
- \`verifier\` for isolated verification analysis
- \`refactor-worktree\` for risky multi-file refactors

Do not use subagents for simple local edits.
"

say
say "== patch .claude/settings.json =="
mkdir -p .claude
python3 - <<'PY'
import json
from pathlib import Path

path = Path(".claude/settings.json")
data = {}
if path.exists():
    try:
        data = json.loads(path.read_text())
    except Exception:
        data = {}

data["model"] = "sonnet"
data["effortLevel"] = "medium"
data.setdefault("permissions", {})
data["permissions"]["defaultMode"] = "plan"

enabled = data.setdefault("enabledPlugins", {})
enabled["typescript-lsp@claude-plugins-official"] = True
enabled["labflow-claude-pack@labflow-tools"] = True

data.pop("hooks", None)

path.write_text(json.dumps(data, indent=2) + "\n")
print(f"patched: {path}")
PY

say
say "== ensure minimal memory files =="
ensure_file ".claude/agent-memory/repo-architect/MEMORY.md" "# repo-architect memory

Keep this file compact.

Store only durable repo facts:
- stable directory boundaries
- canonical workflow files
- command contracts that repeatedly matter
- recurring context-waste patterns
- decisions that change how future work should be sliced

Do not store long transcripts, temporary plans, or obsolete status notes.
"
ensure_file ".claude/agent-memory/verifier/MEMORY.md" "# verifier memory

Keep this file compact.

Store only durable verification learnings:
- smallest reliable command for a package or subsystem
- recurring failure signatures
- known flaky checks and how to interpret them
- repo-specific proof expectations

Do not store raw logs or one-off command output.
"

say
say "== archive duplicate project runtime sources =="
mkdir -p "$PROJECT_ARCHIVE/skills" "$PROJECT_ARCHIVE/agents" "$PROJECT_ARCHIVE/hooks"

for skill in phase-plan phase-work phase-verify handoff; do
  archive_if_exists ".claude/skills/${skill}" "$PROJECT_ARCHIVE/skills/${skill}"
done

for agent in repo-architect implementer verifier refactor-worktree; do
  archive_if_exists ".claude/agents/${agent}.md" "$PROJECT_ARCHIVE/agents/${agent}.md"
done

archive_if_exists ".claude/hooks/filter-verify-output.py" "$PROJECT_ARCHIVE/hooks/filter-verify-output.py"
archive_if_exists ".claude/hooks/stream-failures.py" "$PROJECT_ARCHIVE/hooks/stream-failures.py"

if [ "$MODE" = "--home" ]; then
  say
  say "== archive duplicate home runtime sources =="
  mkdir -p "$HOME_ARCHIVE/skills" "$HOME_ARCHIVE/agents" "$HOME_ARCHIVE/commands" "$HOME_ARCHIVE/hooks"

  for skill in phase-plan phase-work phase-verify handoff; do
    archive_if_exists "$HOME/.claude/skills/${skill}" "$HOME_ARCHIVE/skills/${skill}"
  done

  for agent in repo-architect implementer verifier refactor-worktree; do
    archive_if_exists "$HOME/.claude/agents/${agent}.md" "$HOME_ARCHIVE/agents/${agent}.md"
  done

  for cmd in phase-plan phase-work phase-verify handoff; do
    archive_if_exists "$HOME/.claude/commands/${cmd}.md" "$HOME_ARCHIVE/commands/${cmd}.md"
  done

  archive_if_exists "$HOME/.claude/hooks/filter-verify-output.py" "$HOME_ARCHIVE/hooks/filter-verify-output.py"
  archive_if_exists "$HOME/.claude/hooks/stream-failures.py" "$HOME_ARCHIVE/hooks/stream-failures.py"
fi

say
say "== .gitignore hygiene =="
touch .gitignore
grep -qxF '__pycache__/' .gitignore || echo '__pycache__/' >> .gitignore
grep -qxF '*.pyc' .gitignore || echo '*.pyc' >> .gitignore
grep -qxF '.claude/_archive-duplicates-*/' .gitignore || echo '.claude/_archive-duplicates-*/' >> .gitignore

say
say "== remove tracked cache/archive junk from git index if present =="
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git rm -r --cached --ignore-unmatch plugins/labflow-claude-pack/scripts/__pycache__ >/dev/null 2>&1 || true
  git rm -r --cached --ignore-unmatch .claude/_archive-duplicates-* >/dev/null 2>&1 || true
  find . -type d -name '__pycache__' -prune -print | while read -r d; do
    git rm -r --cached --ignore-unmatch "$d" >/dev/null 2>&1 || true
  done
  find . -type f -name '*.pyc' -print | while read -r f; do
    git rm --cached --ignore-unmatch "$f" >/dev/null 2>&1 || true
  done
  say "git cache cleanup attempted"
else
  say "git not available or not a git repo; skipped index cleanup"
fi

say
say "== tighten CLAUDE.md =="
cat > CLAUDE.md <<'MD'
# LabFlow

Use a phase-first, token-efficient Claude Code workflow with compact durable context.

## Working rules

- Keep this file lean.
- Use only four workflow skills by default:
  - `/labflow-claude-pack:phase-plan`
  - `/labflow-claude-pack:phase-work`
  - `/labflow-claude-pack:phase-verify`
  - `/labflow-claude-pack:handoff`
- Keep repo truth in `STATE.md`, `PHASE_HANDOFF.md`, `known-issues.md`, and `decision-log.md`.
- Verify the smallest changed scope first.
- Do not duplicate the same guidance across multiple files.

## Default runtime workflow

For any non-trivial task:

1. Start in Plan Mode.
2. Define exactly one implementation phase.
3. Execute only that phase.
4. Run the smallest verification that can prove or falsify the change.
5. Update `STATE.md` and `PHASE_HANDOFF.md`.
6. Run `/clear` after the phase is complete or blocked.
7. Resume later from repo truth files, not old chat context.
MD
say "wrote: CLAUDE.md"

say
say "== validate plugin manifests if claude is installed =="
if command -v claude >/dev/null 2>&1; then
  if claude plugin validate . >/dev/null 2>&1; then
    say "pass: root marketplace/plugin validation"
  else
    say "WARN root marketplace/plugin validation failed"
  fi

  if [ -d "plugins/labflow-claude-pack" ]; then
    if (cd plugins/labflow-claude-pack && claude plugin validate . >/dev/null 2>&1); then
      say "pass: plugin directory validation"
    else
      say "WARN plugin directory validation failed"
    fi
  fi
else
  say "claude CLI not found; skipped validation"
fi

say
say "== done =="
say "Next:"
say "  1) ./scripts/audit-token-workflow.sh"
say "  2) git status --short"
say "  3) review archived duplicates under $PROJECT_ARCHIVE"
if [ "$MODE" = "--home" ]; then
  say "  4) review archived home duplicates under $HOME_ARCHIVE"
fi
