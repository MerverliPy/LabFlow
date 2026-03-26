#!/usr/bin/env bash
set -euo pipefail

mkdir -p .github/workflows

cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  ci:
    strategy:
      fail-fast: false
      matrix:
        os:
          - ubuntu-latest
          - macos-latest
          - windows-latest

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Validate manifest
        run: pnpm validate:manifest

      - name: Generate docs
        run: pnpm generate:docs

      - name: Verify generated docs
        run: pnpm verify:generated-docs

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Proof verify
        run: pnpm proof:verify

      - name: Upload proof artifacts
        if: always() && runner.os == 'Linux'
        uses: actions/upload-artifact@v4
        with:
          name: ci-proof-results
          path: verification/runs/**

      - name: Check shell scripts
        if: runner.os == 'Linux'
        run: pnpm check:shell

      - name: Release readiness
        run: pnpm release:readiness

      - name: Pack npm tarball
        if: runner.os == 'Linux'
        run: npm pack

      - name: Verify packed install
        if: runner.os == 'Linux'
        shell: bash
        run: |
          TMP_DIR="$(mktemp -d)"
          cd "$TMP_DIR"
          npm init -y
          npm install "$GITHUB_WORKSPACE"/labflow-*.tgz
          npx --no-install labflow --help
          npx --no-install labflow doctor --json
          npx --no-install labflow status --json
EOF

cat > CONTRIBUTING.md <<'EOF'
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
EOF
