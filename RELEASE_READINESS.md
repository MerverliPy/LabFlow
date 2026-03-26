# Release Readiness

This repository is close to release-ready, but registry publication is not yet fully proven.

## Current status
- Release-ready: not yet fully proven
- Package visibility and metadata: configured in source
- Deterministic lockfile: present
- Canonical repo/homepage/issues metadata: configured
- Proof status: behavioral proof exists
- Packed-install path: verified in CI-oriented flow

## Remaining blockers
- Actual npm publish has not been confirmed from the public registry.
- Clean post-publish install verification from the public registry has not been confirmed yet.

## How to check readiness
Run this command from the repo root:

```bash
pnpm release:readiness
```

## Decision rule
Treat the package as fully publish-ready after:
1. local proof passes
2. dry-run publish passes
3. real npm publish succeeds
4. clean public-registry install verification succeeds
