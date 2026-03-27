# Release Readiness

This repository is now publish-configured and packed-install verified.

## Current status

- Release-ready: almost
- Package visibility: public publish configured
- Public install path: local packed install verified
- Proof status: behavioral proof exists
- Deterministic lockfile: present
- Public metadata: configured

## Remaining blockers

- Actual npm publish has not been executed yet.
- Post-publish install from the public registry has not been verified yet.

## How to check readiness

Run this command from the repo root:

pnpm release:readiness

## Decision rule

Treat the package as publish-ready after:

1. local proof passes
2. dry-run publish passes
3. real npm publish succeeds
4. clean public install verification succeeds
