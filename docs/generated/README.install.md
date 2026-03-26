# Install

## Current status
- Source checkout / local development usage is supported.
- Current root package private mode: `false`.
- Public registry install status should be confirmed with `pnpm release:readiness` and packed-install verification.

## Canonical URLs
- Repo: https://github.com/MerverliPy/LabFlow.git
- Homepage: https://github.com/MerverliPy/LabFlow
- Issues: https://github.com/MerverliPy/LabFlow/issues

## Local development usage
```bash
pnpm install
pnpm exec labflow --help
pnpm exec labflow init
pnpm exec labflow status --json
```

## Notes
- The CLI resolves the manifest from either the repo root or the CLI package path.
- Stable workspace state is stored under `.labflow/` in the current working directory.
- Release blockers are summarized by `pnpm release:readiness` and documented in `RELEASE_READINESS.md`.
- Use proof artifacts and CI output, not stale prose, as the final source of operational truth.
