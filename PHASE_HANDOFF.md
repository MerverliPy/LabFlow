# Phase Handoff

## Objective

Finish truth-surface cleanup without rewriting the repo architecture.

## Why this phase exists

The repo now has a valid monorepo control plane, but the active truth surface still leaks in two places:

- extra legacy skills are still active on disk
- root truth files do not fully reflect the current repo state

## Files to touch

- STATE.md
- PHASE_HANDOFF.md
- known-issues.md
- decision-log.md
- apps/www/AGENTS.md
- archive/claude-skills-legacy/\*
- .claude/skills/\*

## Execution order

1. Archive legacy skills:
   - phase-close
   - resume-latest
   - review-worktree
   - verify-worktree

2. Add `apps/www/AGENTS.md`.

3. Keep root truth concentrated in:
   - `STATE.md`
   - `PHASE_HANDOFF.md`
   - `known-issues.md`
   - `decision-log.md`

4. Verify from repo root:
   - `pnpm verify`
   - `pnpm release:readiness`

5. Run one real Claude Code smoke test using the pack install flow.

## Completion criteria

- Only four default skills remain active in `.claude/skills/`.
- `apps/www` has local guidance.
- Root truth files agree on current state.
- Root verification passes.
- Runtime smoke test result is recorded.
