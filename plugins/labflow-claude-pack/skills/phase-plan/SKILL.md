---
name: phase-plan
description: Plan exactly one implementation phase with tight scope, acceptance checks, and the smallest valid verification path.
disable-model-invocation: true
effort: high
---

1. Read `CLAUDE.md`, `STATE.md`, `PHASE_HANDOFF.md`, `known-issues.md`, and `decision-log.md` when present.
2. Define one phase only.
3. State:
   - objective
   - non-goals
   - exact files or directories in scope
   - acceptance criteria
   - smallest verification command set
4. Keep the phase small enough to complete or block cleanly in one session.
5. Prefer fewer files, fewer commands, and fewer moving parts.
6. End with the next exact step Claude should execute.
