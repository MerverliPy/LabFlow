import fs from 'node:fs';
import path from 'node:path';

export const CORE_PHASE = 'phase-2-minimal-stable-core';
export const CORE_SCOPE = 'stateful terminal-first surface';

export function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, 'config', 'stable-command-manifest.json');
    if (fs.existsSync(candidate)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveManifest(candidateDirs) {
  for (const candidate of candidateDirs) {
    if (!candidate) continue;
    const repoRoot = findRepoRoot(candidate);
    if (!repoRoot) continue;
    const manifestPath = path.join(repoRoot, 'config', 'stable-command-manifest.json');
    return {
      repoRoot,
      manifestPath,
      manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    };
  }

  throw new Error('Unable to locate config/stable-command-manifest.json from the current working directory or package path.');
}

export function getWorkspaceRoot(cwd = process.cwd()) {
  return path.resolve(cwd);
}

export function readCurrentPhase(repoRoot) {
  const statePath = path.join(repoRoot, 'STATE.md');
  if (!fs.existsSync(statePath)) return 'unknown';
  const lines = fs.readFileSync(statePath, 'utf8').split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim() === '## Current phase');
  if (index === -1) return 'unknown';
  const phaseLine = lines.slice(index + 1).find((line) => line.trim());
  return phaseLine ? phaseLine.trim() : 'unknown';
}

export function findLatestProofArtifact(repoRoot) {
  const runsDir = path.join(repoRoot, 'verification', 'runs');
  if (!fs.existsSync(runsDir)) return null;
  const jsonRuns = fs
    .readdirSync(runsDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (jsonRuns.length === 0) return null;
  const latest = jsonRuns[jsonRuns.length - 1];
  return {
    name: latest,
    path: path.join(runsDir, latest)
  };
}

export function implementationCounts(manifest) {
  const counts = { implemented: 0, minimal: 0, planned: 0 };
  for (const status of Object.values(manifest.commandStatus || {})) {
    if (status === 'implemented') counts.implemented += 1;
    else if (status === 'implemented-minimal') counts.minimal += 1;
    else counts.planned += 1;
  }
  return counts;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`${CORE_PHASE} :: ${CORE_SCOPE}`);
}
