# LabFlow

## Repo priorities

1. Keep the stable core small and truthful.
2. Prefer skills over long root instructions.
3. Prefer file-based state over chat-memory dependence.
4. Keep optional extensions out of the default path.
5. Require proof before promotion.

## Stable core only

- `init`
- `task`
- `session`
- `memory`
- `status`
- `doctor`

## Boundaries

- Default to single-agent, phase-first execution.
- Use worktrees for review, risky fixes, verification, and parallel independent work.
- Use subagents only when isolation clearly helps.
- Do not treat plugins or MCP as part of the core path.
- End each phase with verification, checkpoint or commit, and a handoff.
