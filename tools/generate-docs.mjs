import fs from 'node:fs';
import path from 'node:path';

export function buildGeneratedDocs(root = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config', 'stable-command-manifest.json'), 'utf8'));
  const stable = manifest.stableCommands.map((command) => {
    const status = manifest.commandStatus?.[command] || 'planned';
    const summary = manifest.commandSummary?.[command] || '';
    return `- \`${command}\` [${status}] — ${summary}`;
  }).join('\n');
  const experimental = manifest.experimentalAreas.map((c) => '- ' + c).join('\n');
  const parked = manifest.parkedAreas.map((c) => '- ' + c).join('\n');

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
      '- Public npm / `npx` install is still intentionally disabled until publish readiness is proven.'
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
      '- Public npm install is not supported yet.',
      '- This repo is currently a workspace / source checkout, not a published package.',
      '',
      '## Local development usage',
      '```bash',
      'pnpm install',
      'pnpm exec labflow --help',
      'pnpm exec labflow init',
      'pnpm exec labflow status --json',
      '```',
      '',
      '## Notes',
      '- Do not document `npx labflow ...` until the package is published and installed execution is verified.',
      '- The CLI resolves the manifest from either the repo root or the CLI package path.',
      '- Stable workspace state is stored under `.labflow/` in the current working directory.',
      '- Release blockers are summarized by `pnpm release:readiness` and documented in `RELEASE_READINESS.md`.'
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
