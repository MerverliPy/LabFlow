import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config', 'stable-command-manifest.json'), 'utf8'));
const stable = ['init','task','session','memory','status','doctor'];
const skills = ['phase-plan','phase-work','phase-verify','handoff'];
const agents = ['repo-architect','implementer','verifier'];
const allowedStatuses = new Set(['implemented', 'implemented-minimal', 'planned']);
const requiredDocs = [
  path.join(root, 'RELEASE_READINESS.md'),
  path.join(root, 'docs', 'reference', 'identity.md'),
  path.join(root, 'docs', 'reference', 'support-matrix.md'),
  path.join(root, 'docs', 'reference', 'state-contract.md'),
  path.join(root, 'docs', 'generated', 'README.install.md'),
  path.join(root, 'docs', 'generated', 'README.stable-core.md'),
  path.join(root, 'docs', 'generated', 'README.support-matrix.md')
];
const requiredTruthFiles = [
  path.join(root, 'CLAUDE.md'),
  path.join(root, 'STATE.md'),
  path.join(root, 'PHASE_HANDOFF.md'),
  path.join(root, 'known-issues.md'),
  path.join(root, 'decision-log.md')
];

function fail(msg) { console.error(msg); process.exit(1); }

for (const name of stable) if (!manifest.stableCommands.includes(name)) fail(`missing stable command: ${name}`);
for (const name of stable) {
  if (!manifest.commandStatus?.[name]) fail(`missing command status: ${name}`);
  if (!allowedStatuses.has(manifest.commandStatus[name])) fail(`invalid command status: ${name}`);
  if (!manifest.commandSummary?.[name]) fail(`missing command summary: ${name}`);
}
for (const name of skills) {
  if (!manifest.skills.includes(name)) fail(`missing skill: ${name}`);
  if (!fs.existsSync(path.join(root, '.claude', 'skills', name, 'SKILL.md'))) fail(`missing skill file: ${name}`);
}
for (const name of agents) {
  if (!manifest.subagents.includes(name)) fail(`missing subagent: ${name}`);
  if (!fs.existsSync(path.join(root, '.claude', 'agents', `${name}.md`))) fail(`missing subagent file: ${name}`);
}
for (const doc of requiredDocs) {
  if (!fs.existsSync(doc)) fail(`missing required doc: ${path.relative(root, doc)}`);
}
for (const file of requiredTruthFiles) {
  if (!fs.existsSync(file)) fail(`missing truth file: ${path.relative(root, file)}`);
}
if (manifest.identity.productName !== 'LabFlow') fail('identity drift: product');
if (manifest.identity.packageName !== 'labflow') fail('identity drift: package');
if (manifest.identity.cliName !== 'labflow') fail('identity drift: cli');
if (manifest.skills.length !== 4) fail('skill cap drift');

console.log('manifest validation passed');
