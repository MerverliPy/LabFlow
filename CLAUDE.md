# LabFlow

Use a phase-first, token-efficient Claude Code workflow with compact durable context.

## Repo priorities

1. Keep the stable core small and truthful.
2. Prefer skills over long root instructions.
3. Prefer file-based state over chat-memory dependence.
4. Keep optional extensions out of the default path.
5. Require proof before promotion.
6. Keep sessions short and phase-scoped.

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
- Treat archived summaries as historical context, not active truth.

## Default runtime workflow

For any non-trivial task:

1. Start in Plan Mode.
2. Define exactly one implementation phase.
3. Execute only that phase.
4. Run the smallest verification that can prove or falsify the change.
5. Update `STATE.md` and `PHASE_HANDOFF.md`.
6. Clear the session after the phase is complete or blocked.
7. Resume later from repo truth files, not old chat context.

## Session rules

- Default to one phase per session.
- Clear between unrelated tasks.
- Compact only when staying on the same task.
- Prefer fresh sessions over carrying stale context.
- Use subagents only when context isolation materially helps.

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
- Do not treat MCP, large hook catalogs, or extra commands as part of the default path.
- End each meaningful phase by updating `STATE.md` and `PHASE_HANDOFF.md`.

## Active truth files

- `STATE.md` = current phase, blocker, next exact step
- `PHASE_HANDOFF.md` = resumable work note
- `known-issues.md` = active recurring constraints
- `decision-log.md` = durable architecture decisions
