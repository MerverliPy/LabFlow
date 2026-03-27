#!/usr/bin/env bash
set -euo pipefail

TARGET_REPO="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

failures=0

check_file() {
  local path="$1"
  if [ ! -f "${path}" ]; then
    echo "FAIL missing file: ${path}"
    failures=$((failures + 1))
  else
    echo "PASS file: ${path}"
  fi
}

check_absent_dir() {
  local path="$1"
  if [ -d "${path}" ]; then
    echo "FAIL unexpected directory: ${path}"
    failures=$((failures + 1))
  else
    echo "PASS absent: ${path}"
  fi
}

echo "== Pack structure =="
for skill in phase-plan phase-work phase-verify handoff; do
  check_file "${PACK_ROOT}/global/skills/${skill}/SKILL.md"
done

for agent in repo-architect implementer verifier; do
  check_file "${PACK_ROOT}/global/agents/${agent}.md"
done

for file in CLAUDE.md PROJECT.md REQUIREMENTS.md ROADMAP.md STATE.md PHASE_HANDOFF.md known-issues.md decision-log.md .claude/settings.json; do
  check_file "${PACK_ROOT}/project-template/${file}"
done

check_file "${PACK_ROOT}/install/sync-global.sh"
check_file "${PACK_ROOT}/install/bootstrap-project.sh"
check_file "${PACK_ROOT}/install/audit-pack.sh"

echo
echo "== Current repo fit =="
for file in CLAUDE.md STATE.md PHASE_HANDOFF.md known-issues.md decision-log.md config/stable-command-manifest.json docs/reference/skill-map.md; do
  check_file "${TARGET_REPO}/${file}"
done

for skill in phase-plan phase-work phase-verify handoff; do
  check_file "${TARGET_REPO}/.claude/skills/${skill}/SKILL.md"
done

for agent in repo-architect implementer verifier; do
  check_file "${TARGET_REPO}/.claude/agents/${agent}.md"
done

check_absent_dir "${TARGET_REPO}/.claude/commands"
check_absent_dir "${TARGET_REPO}/.claude/hooks"

if [ -f "${TARGET_REPO}/config/stable-command-manifest.json" ]; then
  if grep -q '"skills"' "${TARGET_REPO}/config/stable-command-manifest.json" \
    && grep -q '"phase-plan"' "${TARGET_REPO}/config/stable-command-manifest.json" \
    && grep -q '"phase-work"' "${TARGET_REPO}/config/stable-command-manifest.json" \
    && grep -q '"phase-verify"' "${TARGET_REPO}/config/stable-command-manifest.json" \
    && grep -q '"handoff"' "${TARGET_REPO}/config/stable-command-manifest.json"; then
    echo "PASS manifest includes four canonical skills"
  else
    echo "FAIL manifest skill surface mismatch"
    failures=$((failures + 1))
  fi
fi

if [ "${failures}" -gt 0 ]; then
  echo
  echo "Audit failed with ${failures} issue(s)."
  exit 1
fi

echo
echo "Audit passed."
