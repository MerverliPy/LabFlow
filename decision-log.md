# Decision Log

## 2026-03-27 — Convert to asset-pack-first repo

- Keep the default design file-based and minimal.
- Use narrow agents and a bounded workflow.
- Do not add default MCP or hook sprawl.

## 2026-03-27 — Default to a four-skill workflow

- Keep only:
  `phase-plan`,
  `phase-work`,
  `phase-verify`,
  `handoff`
  in the active default surface.
- Archive overlapping legacy skills instead of
  deleting them immediately.
- Favor ordinary conversation turns over extra
  workflow skills.

## 2026-03-27 — Add local guidance for apps/www

- Treat `apps/www` as a real package boundary.
- Keep website rules local to the app.
- Avoid expanding root `CLAUDE.md` with website
  detail.

## 2026-03-27 — Root truth belongs in four files

- `STATE.md` for current status
- `PHASE_HANDOFF.md` for resumable next work
- `known-issues.md` for live constraints
- `decision-log.md` for durable decisions
