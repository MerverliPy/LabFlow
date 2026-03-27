# State

## Current phase

Phase 4 — truth-surface cleanup and runtime validation

## Current truth

- Root monorepo scripts are authoritative.
- Default Claude Code workflow is four skills:
  `phase-plan`, `phase-work`, `phase-verify`, `handoff`.
- Four legacy skill directories still exist and
  should be archived from the active surface.
- `apps/www` is an active package boundary and
  needs local guidance.
- Real Claude Code runtime validation is still
  pending after structural cleanup.

## Immediate next steps

1. Archive legacy skills from `.claude/skills/`.
2. Add `apps/www/AGENTS.md`.
3. Align root truth files with current repo state.
4. Run `pnpm verify`.
5. Run `pnpm release:readiness`.
6. Smoke test the pack in a real Claude Code
   environment.

## Last verification result

- Structural repo alignment: mostly good.
- Root build/test/verify path: present.
- Claude Code runtime smoke test: pending.

## Active boundaries

- `packages/cli`
- `packages/core`
- `packages/memory`
- `packages/proof-sdk`
- `apps/www`
- `claude-code-pack`
