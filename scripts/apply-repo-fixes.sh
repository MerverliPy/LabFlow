#!/usr/bin/env bash
set -euo pipefail

cd "${1:-.}"

echo '==> Applying LabFlow repo fixes'

mkdir -p apps/www .github/ISSUE_TEMPLATE docs packages/cli .github/workflows

# Move website files from repo root into apps/www
for f in index.html main.js styles.css vite.config.js; do
  if [ -f "$f" ]; then
    mv -f "$f" "apps/www/$f"
    echo "moved: $f -> apps/www/$f"
  fi
done

if [ -d site ]; then
  shopt -s dotglob nullglob
  for f in site/*; do
    mv -f "$f" apps/www/
  done
  shopt -u dotglob nullglob
  rmdir site 2>/dev/null || true
  echo 'moved: site/* -> apps/www/'
fi

# Remove committed package archives
shopt -s nullglob
for f in ./*.tgz; do
  rm -f "$f"
  echo "removed archive: $f"
done
shopt -u nullglob

cat > .editorconfig <<'EOF_EDITORCONFIG'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
EOF_EDITORCONFIG

cat > .gitignore <<'EOF_GITIGNORE'
node_modules/
dist/
coverage/
*.log
*.tgz
.DS_Store
.vscode/
.idea/
.env
.env.*
!.env.example
EOF_GITIGNORE

cat > .prettierrc.json <<'EOF_PRETTIER'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "none"
}
EOF_PRETTIER

cat > .prettierignore <<'EOF_PRETTIERIGNORE'
node_modules
dist
coverage
verification/runs
EOF_PRETTIERIGNORE

cat > .nvmrc <<'EOF_NVMRC'
20
EOF_NVMRC

cat > pnpm-workspace.yaml <<'EOF_WORKSPACE'
packages:
  - apps/*
  - packages/*
EOF_WORKSPACE

cat > package.json <<'EOF_ROOT_PACKAGE'
{
  "name": "labflow-monorepo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm -r --if-present run build",
    "build:www": "pnpm --dir apps/www run build",
    "dev:www": "pnpm --dir apps/www run dev",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "pnpm -r --if-present run lint",
    "test": "pnpm -r --if-present run test",
    "verify": "pnpm format:check && pnpm lint && pnpm test && pnpm build"
  },
  "devDependencies": {
    "prettier": "^3.4.2"
  }
}
EOF_ROOT_PACKAGE

cat > apps/www/package.json <<'EOF_WWW_PACKAGE'
{
  "name": "@labflow/www",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^7.1.0"
  }
}
EOF_WWW_PACKAGE

if [ ! -f apps/www/vite.config.js ] && [ ! -f apps/www/vite.config.ts ]; then
  cat > apps/www/vite.config.js <<'EOF_VITE'
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4173
  }
});
EOF_VITE
fi

cat > packages/cli/package.json <<'EOF_CLI_PACKAGE'
{
  "name": "@labflow/cli",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "bin": {
    "labflow": "./src/index.mjs"
  },
  "exports": {
    ".": "./src/index.mjs"
  },
  "files": [
    "src",
    "README.md",
    "AGENTS.md"
  ],
  "engines": {
    "node": ">=20"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "node --check src/index.mjs",
    "lint": "node --check src/index.mjs",
    "typecheck": "node --check src/index.mjs",
    "test": "node src/index.mjs --help && node src/index.mjs doctor --json && node src/index.mjs status --json"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/MerverliPy/LabFlow.git"
  },
  "bugs": {
    "url": "https://github.com/MerverliPy/LabFlow/issues"
  },
  "homepage": "https://github.com/MerverliPy/LabFlow#readme",
  "keywords": [
    "cli",
    "workspace",
    "developer-tools",
    "terminal"
  ]
}
EOF_CLI_PACKAGE

cat > packages/cli/README.md <<'EOF_CLI_README'
# @labflow/cli

CLI package for the LabFlow workspace toolchain.

## Local usage

    pnpm exec labflow --help
    pnpm exec labflow init
    pnpm exec labflow status --json
    pnpm exec labflow doctor --json
EOF_CLI_README

cat > README.md <<'EOF_README'
# LabFlow

![CI](https://github.com/MerverliPy/LabFlow/actions/workflows/ci.yml/badge.svg)
![Proof](https://github.com/MerverliPy/LabFlow/actions/workflows/proof.yml/badge.svg)
![Publish CLI](https://github.com/MerverliPy/LabFlow/actions/workflows/publish.yml/badge.svg)

LabFlow is a terminal-first workspace CLI for managing local project state, tasks, sessions, and memory from a repository-scoped .labflow directory.

## Status

LabFlow is in an early hardening phase.

Current repo rules:
- the repository root is the workspace orchestrator
- the website lives under apps/www
- the npm publish target is packages/cli
- generated package archives should not be committed

## Quick start

### Prerequisites

- Node.js 20+
- pnpm
- Git

### Install

    pnpm install

### Verify

    pnpm verify

### Run the CLI locally

    pnpm exec labflow --help
    pnpm exec labflow init
    pnpm exec labflow task add "Ship release hardening"
    pnpm exec labflow status --json
    pnpm exec labflow doctor --json

## Repository layout

    apps/www/          Website / landing page
    packages/cli/      Publishable CLI package
    packages/core/     Core shared logic
    packages/memory/   Workspace memory/state logic
    packages/proof-sdk/ Proof / verification package
    docs/              Architecture and release docs
    .github/           Workflows and templates
    verification/      Verification artifacts

## Development workflow

    pnpm format
    pnpm lint
    pnpm test
    pnpm build
    pnpm verify

## Publish target

Only packages/cli should be published to npm.

The repository root is not a publishable npm package.

## Contributing

See CONTRIBUTING.md.

## Security

See SECURITY.md.

## License

See LICENSE.
EOF_README

cat > docs/ARCHITECTURE.md <<'EOF_ARCH'
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
EOF_ARCH

cat > docs/PUBLISHING.md <<'EOF_PUBLISH'
# Publishing

## Publish target

Only packages/cli is intended for npm publication.

## Process

1. Run pnpm verify.
2. Create and publish a GitHub release.
3. Let the publish workflow run from the release event.
4. Validate the published package separately.

## Rules

- Do not publish from the repository root.
- Do not commit package tarballs.
- Keep packages/cli/package.json aligned with workflows and README.
EOF_PUBLISH

cat > CONTRIBUTING.md <<'EOF_CONTRIBUTING'
# Contributing

## Standards

- keep root-level changes focused on orchestration
- keep website changes in apps/www
- keep publish metadata in packages/cli
- prefer small, reviewable pull requests
- avoid committing generated archives

## Local setup

    pnpm install
    pnpm verify

## Commit message examples

- feat(cli): add session replace support
- fix(core): preserve migration ordering
- docs(readme): clarify install paths
- build(ci): publish from packages/cli
EOF_CONTRIBUTING

cat > SECURITY.md <<'EOF_SECURITY'
# Security Policy

Do not report suspected vulnerabilities in public issues.

Provide:
- a clear description
- impact summary
- reproduction steps
- suggested mitigation if available
EOF_SECURITY

cat > CODE_OF_CONDUCT.md <<'EOF_COC'
# Code of Conduct

Be respectful, constructive, and professional.

Unacceptable behavior includes harassment, abuse, doxxing, or hostile conduct in project spaces.
EOF_COC

if [ ! -f LICENSE ]; then
  cat > LICENSE <<'EOF_LICENSE'
MIT License

Copyright (c) 2026 Calvin Brady

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF_LICENSE
fi

cat > .github/PULL_REQUEST_TEMPLATE.md <<'EOF_PR'
## Summary

## Why this change is needed

## Verification

- [ ] pnpm verify passed locally
- [ ] docs updated if needed
- [ ] screenshots included for website/UI changes if applicable

## Risk

## Follow-up work
EOF_PR

cat > .github/ISSUE_TEMPLATE/bug_report.yml <<'EOF_BUG'
name: Bug report
description: Report a reproducible defect
title: "[Bug]: "
labels:
  - bug
body:
  - type: textarea
    id: summary
    attributes:
      label: Summary
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
    validations:
      required: true
EOF_BUG

cat > .github/ISSUE_TEMPLATE/feature_request.yml <<'EOF_FEATURE'
name: Feature request
description: Suggest an improvement
title: "[Feature]: "
labels:
  - enhancement
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed solution
    validations:
      required: true
EOF_FEATURE

cat > .github/ISSUE_TEMPLATE/config.yml <<'EOF_ISSUE_CONFIG'
blank_issues_enabled: true
EOF_ISSUE_CONFIG

cat > .github/workflows/ci.yml <<'EOF_CI'
name: CI

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: |
          if [ -f pnpm-lock.yaml ]; then
            pnpm install --frozen-lockfile
          else
            pnpm install
          fi

      - name: Check formatting
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
EOF_CI

cat > .github/workflows/proof.yml <<'EOF_PROOF'
name: Proof

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  proof:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: |
          if [ -f pnpm-lock.yaml ]; then
            pnpm install --frozen-lockfile
          else
            pnpm install
          fi

      - name: Run test suite
        run: pnpm test

      - name: Build packages
        run: pnpm build
EOF_PROOF

cat > .github/workflows/publish.yml <<'EOF_PUBLISH_WORKFLOW'
name: Publish CLI

on:
  release:
    types:
      - published
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - name: Install dependencies
        run: |
          if [ -f pnpm-lock.yaml ]; then
            pnpm install --frozen-lockfile
          else
            pnpm install
          fi

      - name: Pack CLI
        run: pnpm --dir packages/cli pack

      - name: Publish CLI
        working-directory: packages/cli
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF_PUBLISH_WORKFLOW

cat > .github/workflows/pages.yml <<'EOF_PAGES'
name: Deploy Website

on:
  push:
    branches:
      - main
    paths:
      - 'apps/www/**'
      - '.github/workflows/pages.yml'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: |
          if [ -f pnpm-lock.yaml ]; then
            pnpm install --frozen-lockfile
          else
            pnpm install
          fi

      - name: Build website
        run: pnpm build:www

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/www/dist

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF_PAGES

echo
echo 'Done.'
echo 'Next: bash scripts/verify-local.sh'
