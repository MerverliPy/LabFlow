# Decision Log

## 2026-03-27 — Convert to asset-pack-first Claude Code repo
- Keep the default design file-based and minimal.
- Use global workflow skills and global narrow agents.
- Keep project bootstrap files thin and durable.
- Do not add default MCP or hooks.

## 2026-03-27 — Reduce workflow surface from 8 skills to 4
- Keep only `phase-plan`, `phase-work`, `phase-verify`, and `handoff`.
- Remove overlapping skills that can be expressed as ordinary conversation turns.
- Favor fewer durable commands over command sprawl.

## 2026-03-27 — Enable project memory only where ROI is clear
- Enable project memory for `repo-architect` and `verifier`.
- Keep `implementer` stateless to reduce write noise and accidental memory bloat.
