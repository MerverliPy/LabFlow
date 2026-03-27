# Contributing

Thanks for contributing to LabFlow.

## What this repository optimizes for

LabFlow favors:

- small, reviewable changes
- truthful documentation
- file-first state handling
- proof before promotion
- minimal default complexity

## Repository layout

- `packages/cli/` — CLI entrypoint and command surface
- `packages/core/` — manifest and repo/runtime helpers
- `packages/memory/` — `.labflow` state model
- `packages/proof-sdk/` — behavioral verification harness
- `claude-code-pack/` — reusable Claude Code skills, agents, and templates
- `apps/www/` — website

## Local setup

```bash
pnpm install
```

## Required verification

Run these from the repository root before opening a pull request:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
pnpm proof:verify
```

For a single-command pass, use:

```bash
pnpm verify && pnpm proof:verify
```

## Change guidelines

- Keep pull requests focused.
- Update docs when command behavior, workflows, or public expectations change.
- Do not oversell unpublished or unverified capabilities.
- Prefer editing the smallest correct scope.
- Keep generated archives and one-off backup files out of commits.

## Documentation rules

When public behavior changes, review these files together:

- `README.md`
- `RELEASE_READINESS.md`
- `docs/PUBLISHING.md`
- `packages/cli/src/index.mjs`
- `packages/proof-sdk/src/index.mjs`

They should describe the same truth.

## Pull request expectations

A good pull request should include:

- a clear summary
- the reason for the change
- the exact verification performed
- screenshots for UI changes when applicable
- follow-up work, if anything remains

## Security

Do not report security issues in public issues. See `SECURITY.md`.
