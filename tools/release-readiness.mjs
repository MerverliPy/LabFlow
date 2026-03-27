import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(root, 'config', 'stable-command-manifest.json'),
    'utf8'
  )
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

const checks = [
  {
    name: 'pnpm lockfile',
    ok: fs.existsSync(path.join(root, 'pnpm-lock.yaml')),
    detail: 'pnpm-lock.yaml must exist for deterministic installs.'
  },
  {
    name: 'repository url',
    ok: Boolean(manifest.identity.repoUrl),
    detail: 'config/stable-command-manifest.json identity.repoUrl is unset.'
  },
  {
    name: 'homepage url',
    ok: Boolean(manifest.identity.homepageUrl),
    detail: 'config/stable-command-manifest.json identity.homepageUrl is unset.'
  },
  {
    name: 'issues url',
    ok: Boolean(manifest.identity.issuesUrl),
    detail: 'config/stable-command-manifest.json identity.issuesUrl is unset.'
  },
  {
    name: 'private package mode',
    ok: packageJson.private !== true,
    detail:
      'package.json still marks the repo private, which is correct for unreleased source-only use but blocks publish.'
  }
];

const blockers = checks.filter((item) => !item.ok);

console.log(
  JSON.stringify(
    {
      releaseReady: blockers.length === 0,
      blockers,
      checks
    },
    null,
    2
  )
);

if (process.argv.includes('--enforce') && blockers.length > 0) {
  process.exit(1);
}
