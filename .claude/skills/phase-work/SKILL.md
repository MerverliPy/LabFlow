---
name: phase-work
description: Execute one scoped phase, keep edits small, verify the smallest relevant scope, and update durable state before stopping.
---

# Phase Work

1. Read `CLAUDE.md`, `STATE.md`, `PHASE_HANDOFF.md`, `known-issues.md`, and any closer package guidance.
2. Restate the current phase objective and acceptance target in 5 lines or less.
3. Execute only the current phase. Do not expand scope unless a blocker makes it unavoidable.
4. Prefer the smallest correct change set.
5. Run the smallest relevant verification first.
6. Update `STATE.md` with status, blocker, next exact step, and latest verification result.
7. Update `PHASE_HANDOFF.md` with changed files, outcomes, blockers, and a resume command.
8. Stop once the phase is complete or blocked.
