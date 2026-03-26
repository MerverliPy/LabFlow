# Contributing

## Core rule
Keep the stable core small, truthful, and testable.

## Stable core boundary
The locked stable command surface is:
- `init`
- `task`
- `session`
- `memory`
- `status`
- `doctor`

Do not expand the stable surface casually. New areas belong in experimental or isolated paths until proven.

## Package boundaries
- `packages/cli` — user-facing command surface and command dispatch
- `packages/core` — repo/manifest resolution and shared core helpers
- `packages/memory` — workspace-local durable state under `.labflow/`
- `packages/proof-sdk` — behavioral proof harness and replayable artifacts

## Sources of truth
- Command surface and status: `config/stable-command-manifest.json`
- Workspace state contract: `docs/reference/state-contract.md`
- Generated support/install docs: `docs/generated/*`
- Release status gate: `pnpm release:readiness`
- Behavioral proof artifacts: `verification/runs/*`

## Generated docs rule
Do not hand-edit `docs/generated/*`.
Update the generator and then run:

    pnpm generate:docs
    pnpm verify:generated-docs

## Required validation before a PR
Run from repo root:

    pnpm validate:manifest
    pnpm generate:docs
    pnpm verify:generated-docs
    pnpm build
    pnpm test
    pnpm proof:verify
    pnpm check:shell
    pnpm release:readiness

## Change policy
- Prefer smaller diffs over broad rewrites.
- Add tests before risky refactors.
- Preserve machine-readable output contracts where possible.
- Keep README and reference docs aligned with actual runtime behavior.
- Do not claim publish/install states that are not verified by current checks.

## Proof expectation
A change is not considered complete if it weakens proof coverage or leaves the repo in a state where the proof harness becomes less trustworthy.
