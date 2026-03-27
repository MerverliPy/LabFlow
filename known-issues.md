# Known Issues

## Active constraints

- This repo is still hybrid:
  product code, site assets, and the Claude Code
  utility pack live together.
- A real Claude Code runtime smoke test is still
  needed after structural cleanup.
- Legacy skills still exist on disk until they
  are archived.
- `apps/www` needs local package guidance.

## Current contradictions to watch

- The default workflow is documented as a
  four-skill surface, but legacy skill folders
  still widen the active surface.
- Root truth should live in:
  `STATE.md`, `PHASE_HANDOFF.md`,
  `known-issues.md`, and `decision-log.md`.
  Avoid drifting status notes elsewhere.

## Not a current blocker

- Root monorepo scripts now exist.
- Workspace package discovery includes both
  `apps/*` and `packages/*`.
- CLI package metadata is no longer private.
