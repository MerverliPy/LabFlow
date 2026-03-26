# Release Readiness

This repository is currently a source checkout / implementation pack.

## Current status

- Release-ready: no
- Package visibility: private
- Public install path: disabled
- Proof status: behavioral proof exists
- Deterministic lockfile: present
- Public metadata: configured

## Current blockers

- Root package is intentionally private.
- Public npm publish flow has not been validated.
- Installed public package execution has not been verified.

## How to check readiness

Run this command from the repo root:

pnpm release:readiness

## Decision rule

Until all blockers are cleared, treat this repo as a source checkout / implementation pack, not a public package.
