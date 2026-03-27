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
