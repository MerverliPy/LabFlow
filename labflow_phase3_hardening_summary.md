# LabFlow Phase 3 Hardening Summary

## What was implemented

### Release readiness
- Added `RELEASE_READINESS.md` as the single release-readiness checklist.
- Added `tools/release-readiness.mjs` and the `pnpm release:readiness` script.
- Updated docs and CI to surface release-readiness status without pretending release is complete.

### Proof deepening
- Rewrote `packages/proof-sdk/src/index.mjs` to verify:
  - help surface
  - doctor JSON identity
  - status before init
  - idempotent `init`
  - task lifecycle (`add`, `show`, `done`, `reopen`, `remove`)
  - invalid task failure paths
  - session lifecycle and active-session conflicts
  - memory ordering and tagged notes
  - status after workflow execution
  - corrupted state handling
  - missing state-file handling
- Proof now writes:
  - run report JSON
  - run report Markdown
  - transcripts JSON
  - workspace snapshot JSON files for replay

### State contract
- Added `docs/reference/state-contract.md`.
- Added schema support and migration stubs in `packages/memory/src/store.mjs`.
- Added workspace state inspection and issue reporting.
- Commands now block mutation when required JSON state is missing or corrupted.

### Command hardening
- Added `status --json`.
- Added `doctor --json`.
- Added `task show`, `task reopen`, and `task remove`.
- Added `session history`.
- Added explicit active-session conflict behavior with `session start --replace`.
- Added optional memory tags via `memory append --tag <tag>`.
- Added structured note output via `memory show --json`.
- Made `init` explicitly idempotent and migration-aware.

## What remains intentionally incomplete
- `pnpm-lock.yaml` is still missing because a trustworthy lockfile could not be generated offline.
- Real repository / homepage / issues URLs are still unset because they were not provided.
- Package visibility remains `private` until release decisions are finalized.
- Public npm / `npx` install is still intentionally disabled.

## Verification run
Passed locally with:
- `node tools/generate-docs.mjs`
- `node tools/check-generated-docs.mjs`
- `node tools/validate-manifest.mjs`
- `node packages/cli/src/index.mjs --help`
- `node packages/cli/src/index.mjs doctor --json`
- `node packages/cli/src/index.mjs status --json`
- `node packages/proof-sdk/src/index.mjs verify`
- `bash scripts/check-shell.sh`
- `node tools/release-readiness.mjs`

## Latest proof artifacts
- `verification/runs/2026-03-25T21-45-52-405Z-verify.json`
- `verification/runs/2026-03-25T21-45-52-405Z-verify.md`
