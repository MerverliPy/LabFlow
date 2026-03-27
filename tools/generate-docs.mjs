import fs from 'node:fs';
import path from 'node:path';

import { isMainModule } from '../packages/core/src/runtime.mjs';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function buildGeneratedDocs(root = process.cwd()) {
  const manifest = loadJson(
    path.join(root, 'config', 'stable-command-manifest.json')
  );
  const packageJson = loadJson(path.join(root, 'package.json'));
  const bt = '`'.repeat(3);

  const stable = manifest.stableCommands
    .map((command) => {
      const status = manifest.commandStatus?.[command] || 'planned';
      const summary = manifest.commandSummary?.[command] || '';
      return `- \`${command}\` [${status}] — ${summary}`;
    })
    .join('\n');

  const experimental = manifest.experimentalAreas
    .map((value) => `- ${value}`)
    .join('\n');
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
      `${bt}bash`,
      'pnpm install',
      'pnpm exec labflow --help',
      'pnpm exec labflow init',
      'pnpm exec labflow status --json',
      bt,
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

if (isMainModule(import.meta.url)) {
  writeGeneratedDocs(process.cwd());
  console.log('generated docs updated');
}
