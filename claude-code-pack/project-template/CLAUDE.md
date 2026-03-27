# Project Purpose

Use a phase-first Claude Code workflow with compact durable context.

## Working Rules
- Keep this file small.
- Use the four workflow skills: `/phase-plan`, `/phase-work`, `/phase-verify`, `/handoff`.
- Keep project truth in `STATE.md`, `PHASE_HANDOFF.md`, `known-issues.md`, and `decision-log.md`.
- Verify the smallest changed scope first.
- Do not duplicate the same guidance across multiple files.
- Archive stale notes instead of letting them accumulate.

## Memory
- `STATE.md` is current truth.
- `PHASE_HANDOFF.md` is the resume note.
- `known-issues.md` stores active recurring constraints.
- `decision-log.md` stores durable architecture decisions.
