# Stable Core

Source of truth: `config/stable-command-manifest.json`.

## Stable command surface
- `init` [implemented] — bootstrap or repair .labflow workspace state files in the current directory
- `task` [implemented-minimal] — add, list, show, complete, reopen, and remove lightweight workspace tasks
- `session` [implemented-minimal] — start, inspect, replace, and close the active workspace session
- `memory` [implemented-minimal] — append tagged notes and inspect workspace memory state
- `status` [implemented] — report workspace state, schema health, and proof visibility with optional json
- `doctor` [implemented] — print canonical identity, environment basics, and detect known legacy binaries

## Current implementation status
- All six stable commands now have at least minimal behavior.
- `doctor` verifies canonical identity, environment basics, and legacy binary drift.
- `init` bootstraps `.labflow/` state, is idempotent on re-run, and can migrate older schema metadata.
- `task` supports `add`, `list`, `show`, `done`, `reopen`, and `remove`.
- `session` supports `start`, `show`, `history`, and `close`, with explicit conflict handling for active sessions.
- `memory` supports ordered notes, optional tags, and structured `--json` output.
- `status` reports workspace state plus the latest proof artifact from `verification/runs/`, including `--json` output and state-issue reporting.
- Public npm / `npx` install is still intentionally disabled until publish readiness is proven.
