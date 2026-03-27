# Install

## Current status

- Public npm install is not supported yet.
- This repo is currently a workspace / source checkout, not a published package.

## Local development usage

```bash
pnpm install
pnpm exec labflow --help
pnpm exec labflow init
pnpm exec labflow status --json
```

## Notes

- Do not document `npx labflow ...` until the package is published and installed execution is verified.
- The CLI resolves the manifest from either the repo root or the CLI package path.
- Stable workspace state is stored under `.labflow/` in the current working directory.
- Release blockers are summarized by `pnpm release:readiness` and documented in `RELEASE_READINESS.md`.
