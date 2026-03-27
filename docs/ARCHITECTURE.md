# Architecture

## Overview

LabFlow is a monorepo with one publishable CLI package and supporting internal packages.

## Package boundaries

- apps/www
  - website only
  - never published to npm
- packages/cli
  - public CLI package
  - explicit npm publish target
- packages/core
  - shared core logic
- packages/memory
  - local state and memory behavior
- packages/proof-sdk
  - proof and verification helpers

## Rules

1. Keep website files out of the repo root.
2. Publish only from packages/cli.
3. Do not commit generated .tgz artifacts.
4. Keep README, workflows, and package metadata aligned.
