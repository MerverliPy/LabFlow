#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd)"

if [[ ! -f "$REPO_ROOT/package.json" || ! -d "$REPO_ROOT/packages/cli" ]]; then
  echo "Run this script from the LabFlow repository root." >&2
  exit 1
fi

mkdir -p packages/cli/scripts packages/memory/test scripts .github/workflows

cat > package.json <<'EOF'
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
    "verify": "pnpm format:check && pnpm lint && pnpm test && pnpm build && pnpm proof:verify",
    "proof:verify": "pnpm --dir packages/proof-sdk run verify",
    "release:readiness": "pnpm verify && bash scripts/packed-install-smoke.sh"
  },
  "devDependencies": {
    "prettier": "^3.4.2"
  }
}
EOF

cat > packages/cli/package.json <<'EOF'
{
  "name": "@labflow/cli",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "bin": {
    "labflow": "./dist/index.mjs"
  },
  "exports": {
    ".": "./dist/index.mjs"
  },
  "files": [
    "dist",
    "config",
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
    "build": "node ./scripts/build.mjs && node --check dist/index.mjs",
    "lint": "node --check src/index.mjs",
    "typecheck": "node --check src/index.mjs",
    "test": "node src/index.mjs --help && node src/index.mjs doctor --json && node src/index.mjs status --json",
    "prepack": "pnpm run build"
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
  ],
  "devDependencies": {
    "esbuild": "^0.25.2"
  }
}
EOF

cat > packages/cli/scripts/build.mjs <<'EOF'

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const distDir = path.join(packageRoot, 'dist');
const configDir = path.join(packageRoot, 'config');

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(packageRoot, 'src', 'index.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: path.join(distDir, 'index.mjs'),
});

await fs.mkdir(configDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, 'config', 'stable-command-manifest.json'),
  path.join(configDir, 'stable-command-manifest.json')
);
EOF

python3 <<'PY'
from pathlib import Path

path = Path('packages/cli/src/index.mjs')
text = path.read_text()

old = """    if (
      issue.code === 'unsupported-schema-version' ||
      issue.code === 'missing-schema-version' ||
      issue.code === 'corrupted-meta'
    ) {
      return true;
    }
"""

new = """    if (
      issue.code === 'unsupported-schema-version' ||
      issue.code === 'missing-schema-version' ||
      issue.code === 'corrupted-meta' ||
      issue.code === 'invalid-meta'
    ) {
      return true;
    }
"""

if old not in text:
    raise SystemExit('Target block not found in packages/cli/src/index.mjs')

path.write_text(text.replace(old, new))
print('Patched packages/cli/src/index.mjs')
PY

cat > packages/memory/package.json <<'EOF'
{
  "name": "@labflow/memory",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node --check src/store.mjs && node --check src/index.mjs",
    "typecheck": "echo typecheck-memory",
    "test": "node --test test/*.test.mjs && node --input-type=module -e \"import('./src/index.mjs').then((m) => { const dir = m.ensureStateDir(); if (!dir.endsWith('.labflow')) process.exit(1); console.log('memory exports ok'); })\""
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/MerverliPy/LabFlow.git"
  },
  "homepage": "https://2b7e628c-labflow.calvinbrady8.workers.dev",
  "bugs": {
    "url": "https://github.com/MerverliPy/LabFlow/issues"
  }
}
EOF

cat > packages/memory/test/store.test.mjs <<'EOF'

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  initWorkspace,
  addTask,
  removeTask,
  readTasks,
  readSession,
  inspectWorkspaceState
} from '../src/index.mjs';

const manifest = {
  identity: {
    productName: 'LabFlow',
    cliName: 'labflow'
  },
  stableCommands: ['init', 'task', 'session', 'memory', 'status', 'doctor']
};

function makeWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'labflow-memory-test-'));
}

test('task ids remain monotonic after removals', () => {
  const workspace = makeWorkspace();
  initWorkspace(workspace, manifest);

  const first = addTask(workspace, 'first');
  const second = addTask(workspace, 'second');
  removeTask(workspace, first.id);
  const third = addTask(workspace, 'third');

  assert.equal(first.id, 'task-001');
  assert.equal(second.id, 'task-002');
  assert.equal(third.id, 'task-003');
  assert.deepEqual(
    readTasks(workspace).items.map((item) => item.id),
    ['task-002', 'task-003']
  );
});

test('invalid task shape is reported and readTasks falls back safely', () => {
  const workspace = makeWorkspace();
  initWorkspace(workspace, manifest);

  fs.writeFileSync(path.join(workspace, '.labflow', 'tasks.json'), '{}');

  const inspection = inspectWorkspaceState(workspace);
  assert.ok(inspection.issues.some((issue) => issue.code === 'invalid-tasks'));
  assert.deepEqual(readTasks(workspace), { items: [] });
});

test('invalid session shape is reported and readSession falls back safely', () => {
  const workspace = makeWorkspace();
  initWorkspace(workspace, manifest);

  fs.writeFileSync(
    path.join(workspace, '.labflow', 'session.json'),
    JSON.stringify({ active: {}, history: {} }, null, 2)
  );

  const inspection = inspectWorkspaceState(workspace);
  assert.ok(inspection.issues.some((issue) => issue.code === 'invalid-session'));
  assert.deepEqual(readSession(workspace), { active: null, history: [] });
});
EOF

cat > packages/memory/src/store.mjs <<'EOF'

import fs from 'node:fs';
import path from 'node:path';

const STATE_DIRNAME = '.labflow';
const META_FILE = 'meta.json';
const TASKS_FILE = 'tasks.json';
const SESSION_FILE = 'session.json';
const MEMORY_FILE = 'memory.md';
export const SUPPORTED_STATE_SCHEMA_VERSION = 1;

function isoNow() {
  return new Date().toISOString();
}

function structuredCloneFallback(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultMeta() {
  return {
    schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    productName: null,
    cliName: null,
    initializedAt: null,
    stableCommands: [],
    migratedAt: null,
    nextTaskSequence: 1
  };
}

function defaultTasks() {
  return { items: [] };
}

function defaultSession() {
  return { active: null, history: [] };
}

function defaultMemoryDocument() {
  return [
    '# LabFlow Memory',
    '',
    'Workspace notes written by `labflow memory append`.',
    ''
  ].join('\n');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMetaData(value) {
  if (!isPlainObject(value)) {
    throw new Error('meta state must be an object');
  }

  const normalized = {
    ...defaultMeta(),
    ...value
  };

  if (
    normalized.schemaVersion !== null &&
    typeof normalized.schemaVersion !== 'number'
  ) {
    throw new Error('meta.schemaVersion must be a number');
  }

  if (
    normalized.stableCommands !== null &&
    !Array.isArray(normalized.stableCommands)
  ) {
    throw new Error('meta.stableCommands must be an array');
  }

  if (
    typeof normalized.nextTaskSequence !== 'number' ||
    !Number.isInteger(normalized.nextTaskSequence) ||
    normalized.nextTaskSequence < 1
  ) {
    throw new Error('meta.nextTaskSequence must be a positive integer');
  }

  return normalized;
}

function normalizeTaskItem(item) {
  if (!isPlainObject(item)) {
    throw new Error('task item must be an object');
  }

  if (typeof item.id !== 'string' || item.id.trim() === '') {
    throw new Error('task.id must be a non-empty string');
  }

  if (typeof item.title !== 'string' || item.title.trim() === '') {
    throw new Error('task.title must be a non-empty string');
  }

  if (typeof item.status !== 'string' || item.status.trim() === '') {
    throw new Error('task.status must be a non-empty string');
  }

  return {
    ...item,
    id: item.id.trim(),
    title: item.title.trim(),
    status: item.status.trim()
  };
}

function normalizeTasksData(value) {
  if (Array.isArray(value)) {
    return { items: value.map(normalizeTaskItem) };
  }

  if (!isPlainObject(value)) {
    throw new Error('tasks state must be an object or array');
  }

  if (!Object.prototype.hasOwnProperty.call(value, 'items')) {
    throw new Error('tasks.items is required');
  }

  const { items } = value;
  if (!Array.isArray(items)) {
    throw new Error('tasks.items must be an array');
  }

  return { items: items.map(normalizeTaskItem) };
}

function normalizeSessionRecord(record) {
  if (!isPlainObject(record)) {
    throw new Error('session record must be an object');
  }

  if (typeof record.id !== 'string' || record.id.trim() === '') {
    throw new Error('session.id must be a non-empty string');
  }

  if (typeof record.label !== 'string' || record.label.trim() === '') {
    throw new Error('session.label must be a non-empty string');
  }

  if (
    typeof record.startedAt !== 'string' ||
    record.startedAt.trim() === ''
  ) {
    throw new Error('session.startedAt must be a non-empty string');
  }

  if (
    record.endedAt !== undefined &&
    record.endedAt !== null &&
    (typeof record.endedAt !== 'string' || record.endedAt.trim() === '')
  ) {
    throw new Error('session.endedAt must be a non-empty string when present');
  }

  if (
    record.endedReason !== undefined &&
    record.endedReason !== null &&
    (typeof record.endedReason !== 'string' ||
      record.endedReason.trim() === '')
  ) {
    throw new Error(
      'session.endedReason must be a non-empty string when present'
    );
  }

  if (
    record.endedSummary !== undefined &&
    record.endedSummary !== null &&
    (typeof record.endedSummary !== 'string' ||
      record.endedSummary.trim() === '')
  ) {
    throw new Error(
      'session.endedSummary must be a non-empty string when present'
    );
  }

  return {
    ...record,
    id: record.id.trim(),
    label: record.label.trim(),
    startedAt: record.startedAt.trim(),
    endedAt:
      typeof record.endedAt === 'string' ? record.endedAt.trim() : record.endedAt,
    endedReason:
      typeof record.endedReason === 'string'
        ? record.endedReason.trim()
        : record.endedReason,
    endedSummary:
      typeof record.endedSummary === 'string'
        ? record.endedSummary.trim()
        : record.endedSummary
  };
}

function normalizeSessionData(value) {
  if (Array.isArray(value)) {
    return { active: null, history: value.map(normalizeSessionRecord) };
  }

  if (!isPlainObject(value)) {
    throw new Error('session state must be an object or array');
  }

  const activeSource = value.active ?? value.activeSession ?? null;
  const historySource =
    value.history ?? value.historyItems ?? value.closedSessions ?? [];

  if (activeSource !== null && activeSource !== undefined && !isPlainObject(activeSource)) {
    throw new Error('session.active must be an object when present');
  }

  if (!Array.isArray(historySource)) {
    throw new Error('session.history must be an array');
  }

  return {
    active: activeSource ? normalizeSessionRecord(activeSource) : null,
    history: historySource.map(normalizeSessionRecord)
  };
}

function deriveNextTaskSequenceFromItems(items) {
  let max = 0;

  for (const item of items) {
    const match = item.id.match(/^task-(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return max + 1;
}

export function workspaceStateDir(workspaceRoot = process.cwd()) {
  return path.join(path.resolve(workspaceRoot), STATE_DIRNAME);
}

export function workspaceFiles(workspaceRoot = process.cwd()) {
  const stateDir = workspaceStateDir(workspaceRoot);
  return {
    stateDir,
    meta: path.join(stateDir, META_FILE),
    tasks: path.join(stateDir, TASKS_FILE),
    session: path.join(stateDir, SESSION_FILE),
    memory: path.join(stateDir, MEMORY_FILE)
  };
}

export function ensureStateDir(workspaceRoot = process.cwd()) {
  const stateDir = workspaceStateDir(workspaceRoot);
  fs.mkdirSync(stateDir, { recursive: true });
  return stateDir;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pushIssue(issues, issue) {
  issues.push({
    severity: 'error',
    ...issue
  });
}

function safeReadJson(filePath, fallback, code, issues, normalizer = null) {
  if (!fs.existsSync(filePath)) {
    if (issues) {
      pushIssue(issues, {
        code: `missing-${code}`,
        file: filePath,
        message: `State file is missing: ${path.basename(filePath)}`
      });
    }
    return structuredCloneFallback(fallback);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (issues) {
      pushIssue(issues, {
        code: `corrupted-${code}`,
        file: filePath,
        message: `State file is not valid JSON: ${path.basename(filePath)}`,
        detail: error.message
      });
    }
    return structuredCloneFallback(fallback);
  }

  if (!normalizer) return parsed;

  try {
    return normalizer(parsed);
  } catch (error) {
    if (issues) {
      pushIssue(issues, {
        code: `invalid-${code}`,
        file: filePath,
        message: `State file has an invalid structure: ${path.basename(filePath)}`,
        detail: error.message
      });
    }
    return structuredCloneFallback(fallback);
  }
}

function ensureMemoryFile(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  ensureStateDir(workspaceRoot);
  if (!fs.existsSync(files.memory))
    fs.writeFileSync(files.memory, defaultMemoryDocument());
  return files.memory;
}

function readMetaForWrite(workspaceRoot) {
  const meta = safeReadJson(
    workspaceFiles(workspaceRoot).meta,
    defaultMeta(),
    'meta',
    null,
    normalizeMetaData
  );
  const tasks = safeReadJson(
    workspaceFiles(workspaceRoot).tasks,
    defaultTasks(),
    'tasks',
    null,
    normalizeTasksData
  );
  return {
    ...meta,
    nextTaskSequence: Math.max(
      meta.nextTaskSequence,
      deriveNextTaskSequenceFromItems(tasks.items)
    )
  };
}

function writeMeta(workspaceRoot, meta) {
  writeJson(workspaceFiles(workspaceRoot).meta, normalizeMetaData(meta));
}

export function initWorkspace(workspaceRoot, manifest) {
  const files = workspaceFiles(workspaceRoot);
  const created = [];
  const existing = [];
  ensureStateDir(workspaceRoot);

  const defaults = {
    [files.meta]: {
      schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
      productName: manifest.identity.productName,
      cliName: manifest.identity.cliName,
      initializedAt: isoNow(),
      stableCommands: manifest.stableCommands,
      migratedAt: null,
      nextTaskSequence: 1
    },
    [files.tasks]: defaultTasks(),
    [files.session]: defaultSession(),
    [files.memory]: defaultMemoryDocument()
  };

  for (const [filePath, value] of Object.entries(defaults)) {
    if (fs.existsSync(filePath)) {
      existing.push(filePath);
      continue;
    }

    if (filePath.endsWith('.json')) writeJson(filePath, value);
    else fs.writeFileSync(filePath, value);
    created.push(filePath);
  }

  return {
    stateDir: files.stateDir,
    created,
    existing
  };
}

export function isInitialized(workspaceRoot) {
  return fs.existsSync(workspaceFiles(workspaceRoot).meta);
}

export function migrateWorkspaceState(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  if (!fs.existsSync(files.meta))
    return {
      migrated: false,
      fromVersion: null,
      toVersion: SUPPORTED_STATE_SCHEMA_VERSION
    };

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(files.meta, 'utf8'));
  } catch {
    return {
      migrated: false,
      fromVersion: null,
      toVersion: SUPPORTED_STATE_SCHEMA_VERSION
    };
  }

  const fromVersion =
    typeof meta.schemaVersion === 'number' ? meta.schemaVersion : 0;
  const needsRepair =
    fromVersion < SUPPORTED_STATE_SCHEMA_VERSION ||
    typeof meta.nextTaskSequence !== 'number' ||
    !Number.isInteger(meta.nextTaskSequence) ||
    meta.nextTaskSequence < 1;

  if (!needsRepair) {
    return {
      migrated: false,
      fromVersion,
      toVersion: SUPPORTED_STATE_SCHEMA_VERSION
    };
  }

  const tasks = safeReadJson(
    files.tasks,
    defaultTasks(),
    'tasks',
    null,
    normalizeTasksData
  );

  const next = normalizeMetaData({
    ...defaultMeta(),
    ...meta,
    schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    migratedAt: isoNow(),
    nextTaskSequence: Math.max(
      meta.nextTaskSequence ?? 1,
      deriveNextTaskSequenceFromItems(tasks.items)
    )
  });

  writeJson(files.meta, next);
  return {
    migrated: true,
    fromVersion,
    toVersion: SUPPORTED_STATE_SCHEMA_VERSION
  };
}

export function inspectWorkspaceState(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  const stateDirExists = fs.existsSync(files.stateDir);
  const issues = [];

  if (!fs.existsSync(files.meta)) {
    if (
      stateDirExists &&
      (fs.existsSync(files.tasks) ||
        fs.existsSync(files.session) ||
        fs.existsSync(files.memory))
    ) {
      pushIssue(issues, {
        code: 'missing-meta',
        file: files.meta,
        message: 'State directory exists but meta.json is missing.'
      });
    }
    return {
      stateDir: files.stateDir,
      initialized: false,
      schemaVersion: null,
      issues
    };
  }

  const meta = safeReadJson(
    files.meta,
    defaultMeta(),
    'meta',
    issues,
    normalizeMetaData
  );
  const schemaVersion =
    typeof meta.schemaVersion === 'number' ? meta.schemaVersion : null;
  if (schemaVersion === null) {
    pushIssue(issues, {
      code: 'missing-schema-version',
      file: files.meta,
      message: 'meta.json is missing schemaVersion.'
    });
  } else if (schemaVersion > SUPPORTED_STATE_SCHEMA_VERSION) {
    pushIssue(issues, {
      code: 'unsupported-schema-version',
      file: files.meta,
      message: `schemaVersion ${schemaVersion} is newer than supported version ${SUPPORTED_STATE_SCHEMA_VERSION}.`
    });
  }

  safeReadJson(files.tasks, defaultTasks(), 'tasks', issues, normalizeTasksData);
  safeReadJson(
    files.session,
    defaultSession(),
    'session',
    issues,
    normalizeSessionData
  );
  if (!fs.existsSync(files.memory)) {
    pushIssue(issues, {
      code: 'missing-memory',
      file: files.memory,
      message: 'State file is missing: memory.md'
    });
  }

  return {
    stateDir: files.stateDir,
    initialized: true,
    schemaVersion,
    issues
  };
}

export function readMeta(workspaceRoot) {
  return safeReadJson(
    workspaceFiles(workspaceRoot).meta,
    defaultMeta(),
    'meta',
    null,
    normalizeMetaData
  );
}

export function readTasks(workspaceRoot) {
  return safeReadJson(
    workspaceFiles(workspaceRoot).tasks,
    defaultTasks(),
    'tasks',
    null,
    normalizeTasksData
  );
}

export function findTask(workspaceRoot, taskId) {
  return (
    readTasks(workspaceRoot).items.find((item) => item.id === taskId) || null
  );
}

export function addTask(workspaceRoot, title) {
  if (!title || !title.trim()) throw new Error('Task title is required.');
  const data = readTasks(workspaceRoot);
  const meta = readMetaForWrite(workspaceRoot);
  const index = meta.nextTaskSequence;
  const task = {
    id: `task-${String(index).padStart(3, '0')}`,
    title: title.trim(),
    status: 'open',
    createdAt: isoNow()
  };
  data.items.push(task);
  writeJson(workspaceFiles(workspaceRoot).tasks, data);
  writeMeta(workspaceRoot, {
    ...meta,
    nextTaskSequence: index + 1
  });
  return task;
}

export function completeTask(workspaceRoot, taskId) {
  const data = readTasks(workspaceRoot);
  const task = data.items.find((item) => item.id === taskId);
  if (!task) return null;
  task.status = 'done';
  task.completedAt = isoNow();
  writeJson(workspaceFiles(workspaceRoot).tasks, data);
  return task;
}

export function reopenTask(workspaceRoot, taskId) {
  const data = readTasks(workspaceRoot);
  const task = data.items.find((item) => item.id === taskId);
  if (!task) return null;
  task.status = 'open';
  task.reopenedAt = isoNow();
  delete task.completedAt;
  writeJson(workspaceFiles(workspaceRoot).tasks, data);
  return task;
}

export function removeTask(workspaceRoot, taskId) {
  const data = readTasks(workspaceRoot);
  const index = data.items.findIndex((item) => item.id === taskId);
  if (index === -1) return null;
  const [task] = data.items.splice(index, 1);
  task.removedAt = isoNow();
  writeJson(workspaceFiles(workspaceRoot).tasks, data);
  return task;
}

export function readSession(workspaceRoot) {
  return safeReadJson(
    workspaceFiles(workspaceRoot).session,
    defaultSession(),
    'session',
    null,
    normalizeSessionData
  );
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function startSession(workspaceRoot, label = 'default', options = {}) {
  const { replace = false } = options;
  const data = readSession(workspaceRoot);
  if (data.active && !replace) {
    return { started: false, conflict: true, session: data.active };
  }

  if (data.active && replace) {
    data.history.push({
      ...data.active,
      endedAt: isoNow(),
      endedReason: 'replaced'
    });
  }

  data.active = {
    id: createSessionId(),
    label: label.trim() || 'default',
    startedAt: isoNow()
  };
  writeJson(workspaceFiles(workspaceRoot).session, data);
  return { started: true, conflict: false, session: data.active };
}

export function closeSession(workspaceRoot, summaryText = null) {
  const data = readSession(workspaceRoot);
  if (!data.active) return null;
  const closed = {
    ...data.active,
    endedAt: isoNow(),
    endedReason: 'closed',
    endedSummary: summaryText && summaryText.trim() ? summaryText.trim() : null
  };
  data.history.push(closed);
  data.active = null;
  writeJson(workspaceFiles(workspaceRoot).session, data);
  return closed;
}

function formatMemoryNote(timestamp, text, tag) {
  const tagPart = tag ? `[tag:${tag}] ` : '';
  return `- ${timestamp} ${tagPart}:: ${text}\n`;
}

function parseMemoryNoteLine(line) {
  const match = line.match(/^- ([^\s]+) (?:\[tag:([^\]]+)\] )?:: (.*)$/);
  if (!match) return null;
  return {
    timestamp: match[1],
    tag: match[2] || null,
    text: match[3],
    raw: line
  };
}

export function appendMemoryNote(workspaceRoot, text, tag = null) {
  if (!text || !text.trim()) throw new Error('Memory note text is required.');
  if (tag && !tag.trim()) throw new Error('Memory note tag cannot be empty.');
  const filePath = ensureMemoryFile(workspaceRoot);
  const timestamp = isoNow();
  const note = formatMemoryNote(
    timestamp,
    text.trim(),
    tag ? tag.trim() : null
  );
  fs.appendFileSync(filePath, note);
  return {
    path: filePath,
    note,
    entry: parseMemoryNoteLine(note.trim())
  };
}

export function readMemoryEntries(workspaceRoot) {
  const filePath = workspaceFiles(workspaceRoot).memory;
  if (!fs.existsSync(filePath)) return [];
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  return lines.map(parseMemoryNoteLine).filter(Boolean);
}

export function readMemorySummary(workspaceRoot) {
  const filePath = workspaceFiles(workspaceRoot).memory;
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      lines: 0,
      notes: 0,
      lastLine: null
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const notes = lines.filter((line) => line.startsWith('- '));
  return {
    path: filePath,
    lines: lines.length,
    notes: notes.length,
    lastLine: notes.length ? notes[notes.length - 1] : null
  };
}

export function summarizeWorkspace(workspaceRoot) {
  const tasks = readTasks(workspaceRoot).items;
  const session = readSession(workspaceRoot);
  const memory = readMemorySummary(workspaceRoot);
  const inspection = inspectWorkspaceState(workspaceRoot);
  return {
    initialized: inspection.initialized,
    schemaVersion: inspection.schemaVersion,
    stateIssues: inspection.issues,
    taskCount: tasks.length,
    openTaskCount: tasks.filter((task) => task.status !== 'done').length,
    activeSession: session.active,
    sessionHistoryCount: session.history.length,
    memoryNotes: memory.notes
  };
}

if (process.argv[1] && process.argv[1].endsWith('store.mjs')) {
  ensureStateDir();
  console.log('memory store ready');
}
EOF

cat > .github/workflows/ci.yml <<'EOF'
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

      - name: Verify workspace
        run: pnpm verify
EOF

cat > .github/workflows/publish.yml <<'EOF'
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

      - name: Verify workspace
        run: pnpm verify

      - name: Packed-install smoke test
        run: bash scripts/packed-install-smoke.sh

      - name: Publish CLI
        working-directory: packages/cli
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF

cat > scripts/packed-install-smoke.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="$REPO_ROOT/packages/cli"
INSTALL_ROOT="$(mktemp -d)"
WORKSPACE_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$INSTALL_ROOT" "$WORKSPACE_ROOT"
}

trap cleanup EXIT

find "$PACKAGE_DIR" -maxdepth 1 -name '*.tgz' -delete

(
  cd "$REPO_ROOT"
  pnpm --dir packages/cli pack >/dev/null
)

TARBALL="$(ls -1t "$PACKAGE_DIR"/*.tgz | head -n 1)"

if [[ -z "${TARBALL:-}" || ! -f "$TARBALL" ]]; then
  echo "Packed-install smoke test failed: no CLI tarball was produced." >&2
  exit 1
fi

(
  cd "$INSTALL_ROOT"
  npm init -y >/dev/null 2>&1
  npm install "$TARBALL" >/dev/null 2>&1
  ./node_modules/.bin/labflow --help >/dev/null
  ./node_modules/.bin/labflow doctor --json > doctor.json
  node - <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('doctor.json', 'utf8'));
if (payload.product?.productName !== 'LabFlow') {
  throw new Error('doctor productName drift in packed install');
}
if (payload.product?.cliName !== 'labflow') {
  throw new Error('doctor cliName drift in packed install');
}
NODE
)

(
  cd "$WORKSPACE_ROOT"
  "$INSTALL_ROOT/node_modules/.bin/labflow" init --json >/dev/null
  "$INSTALL_ROOT/node_modules/.bin/labflow" status --json > status.json
  node - <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync('status.json', 'utf8'));
if (payload.initialized !== true) {
  throw new Error('packed install should initialize workspace successfully');
}
if (payload.product !== 'LabFlow') {
  throw new Error('packed install status product drift');
}
NODE
)

echo "Packed-install smoke test passed: $TARBALL"
EOF
chmod +x scripts/packed-install-smoke.sh

echo "Critical hardening patch applied."
echo "Next:"
echo "  1) corepack enable"
echo "  2) pnpm install"
echo "  3) pnpm verify"
echo "  4) bash scripts/packed-install-smoke.sh"
