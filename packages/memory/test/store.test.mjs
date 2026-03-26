import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  initWorkspace,
  addTask,
  removeTask,
  readMeta,
  startSession,
  closeSession,
  inspectWorkspaceState,
  appendMemoryNote,
  readMemoryEntries
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

test('task ids stay monotonic after removals', () => {
  const root = makeWorkspace();

  initWorkspace(root, manifest);

  const first = addTask(root, 'one');
  const second = addTask(root, 'two');
  const removed = removeTask(root, second.id);
  const third = addTask(root, 'three');
  const meta = readMeta(root);

  assert.equal(first.id, 'task-001');
  assert.equal(removed.id, 'task-002');
  assert.equal(third.id, 'task-003');
  assert.equal(meta.nextTaskId, 4);
});

test('session ids do not collide across starts', () => {
  const root = makeWorkspace();

  initWorkspace(root, manifest);

  const first = startSession(root, 'alpha').session;
  closeSession(root);
  const second = startSession(root, 'beta').session;

  assert.notEqual(first.id, second.id);
});

test('invalid task shape is reported by inspectWorkspaceState', () => {
  const root = makeWorkspace();

  initWorkspace(root, manifest);

  fs.writeFileSync(
    path.join(root, '.labflow', 'tasks.json'),
    `${JSON.stringify({ items: {} }, null, 2)}\n`,
    'utf8'
  );

  const inspection = inspectWorkspaceState(root);

  assert.equal(
    inspection.issues.some((issue) => issue.code === 'invalid-tasks'),
    true
  );
});

test('memory notes preserve order and tags', () => {
  const root = makeWorkspace();

  initWorkspace(root, manifest);

  appendMemoryNote(root, 'first note', 'release');
  appendMemoryNote(root, 'second note');

  const entries = readMemoryEntries(root);

  assert.equal(entries.length, 2);
  assert.equal(entries[0].tag, 'release');
  assert.equal(entries[0].text, 'first note');
  assert.equal(entries[1].text, 'second note');
});
