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
