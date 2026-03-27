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
  assert.ok(
    inspection.issues.some((issue) => issue.code === 'invalid-session')
  );
  assert.deepEqual(readSession(workspace), { active: null, history: [] });
});
