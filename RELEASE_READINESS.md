# Release Readiness

This file is the single release-readiness checklist for the LabFlow starter repo.

## Current status
- Release-ready: **no**
- Package visibility: **private**
- Public install path: **disabled**
- Proof status: **behavioral proof exists**
- Deterministic lockfile: **missing**
- Public metadata: **configured**

## Current blockers
- `pnpm-lock.yaml` is not present.
- `package.json` is still `private: true`.
- No public npm publish path has been verified.

## Readiness command
```bash
pnpm release:readiness
```

Use `pnpm release:readiness -- --enforce` only when you want the command to fail on remaining blockers.

## Release gate
Before enabling `npx labflow ...` or publish docs, all of the following must be true:
- lockfile exists
- repository URL is real
- homepage URL is real
- issues URL is real
- package visibility decision is finalized
- installed execution has been verified
- proof and docs match release behavior

## Decision rule
Until every blocker above is cleared, this repo should be treated as a **source checkout / implementation pack**, not a public package.
