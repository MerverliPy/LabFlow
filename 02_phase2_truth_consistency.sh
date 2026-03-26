#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

cli = Path("packages/cli/src/index.mjs")
cli_text = cli.read_text()
cli_old = "  console.log('- Local packed install has been verified. Public npm publish is live.');"
cli_new = "  console.log('- Public install status should be confirmed with pnpm release:readiness and packed-install verification.');"
if cli_old not in cli_text:
    raise SystemExit("target string not found in packages/cli/src/index.mjs")
cli.write_text(cli_text.replace(cli_old, cli_new))

proof = Path("packages/proof-sdk/src/index.mjs")
proof_text = proof.read_text()
proof_old = """    assert(
      help.stdout.includes('Local packed install has been verified.') &&
        help.stdout.includes('Public npm publish is live.'),
      'help missing install truth note'
    );"""
proof_new = """    assert(
      help.stdout.includes('Public install status should be confirmed with pnpm release:readiness and packed-install verification.'),
      'help missing install truth note'
    );"""
if proof_old not in proof_text:
    raise SystemExit("target assertion not found in packages/proof-sdk/src/index.mjs")
proof.write_text(proof_text.replace(proof_old, proof_new))
PY

cat > README.md <<'EOF'
# LabFlow GitHub Implementation Pack

GitHub-ready starter repo for **LabFlow** optimized for a terminal-first workflow.

## Locked decisions
- Product / package / CLI / repo identity: **LabFlow / labflow / labflow**
- Stable core only: `init`, `task`, `session`, `memory`, `status`, `doctor`
- Skills-first Claude Code surface
- Thin root `CLAUDE.md`
- Proof harness is a behavioral gate
- Three hardened subagents only
- Zero required plugins or MCP servers in the default path

## Current truth
- all 6 stable commands have real local behavior
- workspace state is stored in `.labflow/`
- `status --json` reports schema health and proof visibility
- canonical identity is defined in `config/stable-command-manifest.json`
- repo, homepage, and issues metadata are configured
- public install status must be confirmed with `pnpm release:readiness` and packed-install verification
- release blockers are tracked in `RELEASE_READINESS.md`

## What works now
- `labflow init` bootstraps or repairs workspace state files
- `labflow status [--json]` reports workspace state, schema version, and latest proof artifact
- `labflow task add|list|show|done|reopen|remove` manages lightweight tasks
- `labflow session start|show|history|close` manages the active session and closed-session history
- `labflow memory append|show` manages local memory notes with optional tags
- `labflow doctor [--json]` prints canonical identity, environment basics, and legacy-binary drift

## First commands

    pnpm install
    pnpm validate:manifest
    pnpm generate:docs
    pnpm verify:generated-docs
    pnpm build
    pnpm test
    pnpm proof:verify
    pnpm check:shell
    pnpm release:readiness

## Local CLI usage

    pnpm exec labflow --help
    pnpm exec labflow init
    pnpm exec labflow task add "Ship release hardening"
    pnpm exec labflow status --json
EOF

cat > RELEASE_READINESS.md <<'EOF'
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

    pnpm release:readiness

## Decision rule
Treat the package as fully publish-ready after:
1. local proof passes
2. dry-run publish passes
3. real npm publish succeeds
4. clean public-registry install verification succeeds
EOF

mkdir -p docs/reference

cat > docs/reference/identity.md <<'EOF'
# Identity

## Canonical identity
- Product: **LabFlow**
- Package: **labflow**
- CLI: **labflow**
- Repo: **labflow**

## Canonical URLs
- Repo: **https://github.com/MerverliPy/LabFlow.git**
- Homepage: **https://github.com/MerverliPy/LabFlow**
- Issues: **https://github.com/MerverliPy/LabFlow/issues**

## Doctor behavior
`labflow doctor` prints the canonical identity, current workspace root, current `.labflow/` state path, repo root, manifest path, Node version, package-manager identity, schema support, and warnings for known legacy binaries (`ruflo`, `claude-flow`) when detected in `PATH`.

## Install policy
- Source checkout and local development usage are supported.
- Public registry install status must be confirmed by `pnpm release:readiness` and packed-install verification.
- Do not treat README text alone as proof of registry availability.
EOF

cat > tools/generate-docs.mjs <<'EOF'
import fs from 'node:fs';
import path from 'node:path';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function buildGeneratedDocs(root = process.cwd()) {
  const manifest = loadJson(path.join(root, 'config', 'stable-command-manifest.json'));
  const packageJson = loadJson(path.join(root, 'package.json'));

  const stable = manifest.stableCommands
    .map((command) => {
      const status = manifest.commandStatus?.[command] || 'planned';
      const summary = manifest.commandSummary?.[command] || '';
      return `- \`${command}\` [${status}] — ${summary}`;
    })
    .join('\n');

  const experimental = manifest.experimentalAreas.map((value) => `- ${value}`).join('\n');
  const parked = manifest.parkedAreas.map((value) => `- ${value}`).join('\n');

  const privateMode = packageJson.private === true ? 'true' : 'false';

  return {
    'README.stable-core.md': [
      '# Stable Core',
      '',
      'Source of truth: `config/stable-command-manifest.json`.',
      '',
      '## Stable command surface',
      stable,
      '',
      '## Current implementation status',
      '- All six stable commands now have at least minimal behavior.',
      '- `doctor` verifies canonical identity, environment basics, and legacy binary drift.',
      '- `init` bootstraps `.labflow/` state, is idempotent on re-run, and can migrate older schema metadata.',
      '- `task` supports `add`, `list`, `show`, `done`, `reopen`, and `remove`.',
      '- `session` supports `start`, `show`, `history`, and `close`, with explicit conflict handling for active sessions.',
      '- `memory` supports ordered notes, optional tags, and structured `--json` output.',
      '- `status` reports workspace state plus the latest proof artifact from `verification/runs/`, including `--json` output and state-issue reporting.',
      '- Public install status should be confirmed with `pnpm release:readiness` and packed-install verification.'
    ].join('\n'),
    'README.support-matrix.md': [
      '# Support Matrix',
      '',
      'Source of truth: `config/stable-command-manifest.json`.',
      '',
      '## Stable',
      stable,
      '',
      '## Experimental',
      experimental,
      '',
      '## Parked',
      parked
    ].join('\n'),
    'README.install.md': [
      '# Install',
      '',
      '## Current status',
      '- Source checkout / local development usage is supported.',
      `- Current root package private mode: \`${privateMode}\`.`,
      '- Public registry install status should be confirmed with `pnpm release:readiness` and packed-install verification.',
      '',
      '## Canonical URLs',
      `- Repo: ${manifest.identity.repoUrl}`,
      `- Homepage: ${manifest.identity.homepageUrl}`,
      `- Issues: ${manifest.identity.issuesUrl}`,
      '',
      '## Local development usage',
      '',
      '    pnpm install',
      '    pnpm exec labflow --help',
      '    pnpm exec labflow init',
      '    pnpm exec labflow status --json',
      '',
      '## Notes',
      '- The CLI resolves the manifest from either the repo root or the CLI package path.',
      '- Stable workspace state is stored under `.labflow/` in the current working directory.',
      '- Release blockers are summarized by `pnpm release:readiness` and documented in `RELEASE_READINESS.md`.',
      '- Use proof artifacts and CI output, not stale prose, as the final source of operational truth.'
    ].join('\n')
  };
}

export function writeGeneratedDocs(root = process.cwd()) {
  const docs = buildGeneratedDocs(root);
  const outDir = path.join(root, 'docs', 'generated');

  fs.mkdirSync(outDir, { recursive: true });

  for (const [filename, content] of Object.entries(docs)) {
    fs.writeFileSync(path.join(outDir, filename), `${content}\n`);
  }

  return Object.keys(docs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeGeneratedDocs(process.cwd());
  console.log('generated docs updated');
}
EOF

node tools/generate-docs.mjs
