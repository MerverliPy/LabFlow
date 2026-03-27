# LabFlow

Use a phase-first Claude Code workflow with compact durable context.

## Repo priorities

1. Keep the stable core small and truthful.
2. Prefer skills over long root instructions.
3. Prefer file-based state over chat-memory dependence.
4. Keep optional extensions out of the default path.
5. Require proof before promotion.

## Working rules

- Keep this file lean.
- Use only four workflow skills by default: `/phase-plan`, `/phase-work`, `/phase-verify`, `/handoff`.
- Keep repo truth in `STATE.md`, `PHASE_HANDOFF.md`, `known-issues.md`, and `decision-log.md`.
- Verify the smallest changed scope first.
- Do not duplicate the same guidance across multiple files.
- Treat archived summaries as historical context, not active truth.

## Stable core only

- `init`
- `task`
- `session`
- `memory`
- `status`
- `doctor`

## Boundaries

- Default to single-agent, phase-first execution.
- Use worktrees only when isolation materially reduces risk.
- Use subagents only when isolation clearly helps context control or verification.
- Do not treat plugins, MCP, or hooks as part of the default path.
- End each meaningful phase by updating `STATE.md` and `PHASE_HANDOFF.md`.

## Active truth files

- `STATE.md` = current phase, blocker, next exact step
- `PHASE_HANDOFF.md` = resumable work note
- `known-issues.md` = active recurring constraints
- `decision-log.md` = durable architecture decisions
