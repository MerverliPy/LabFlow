#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findRepoRoot } from '../../core/src/index.mjs';

const mode = process.argv[2] || 'verify';

const repoRoot =
  findRepoRoot(process.cwd()) ||
  findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));

if (!repoRoot) {
  console.error('proof verify failed: repo root not found');
  process.exit(1);
}

const outDir = path.join(repoRoot, 'verification', 'runs');
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'config', 'stable-command-manifest.json'), 'utf8')
);
const cliPath = path.join(repoRoot, 'packages', 'cli', 'src', 'index.mjs');

fs.mkdirSync(outDir, { recursive: true });

function runCli(args, cwd = repoRoot) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: process.env,
    encoding: 'utf8'
  });

  return {
    args,
    cwd,
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJsonOutput(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `${label} did not emit valid JSON: ${error.message}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
}

function recordTranscript(name, result) {
  transcripts[name] = result;
  return result;
}

function recordSnapshot(label, workspacePath) {
  const files = {};
  const stateRoot = path.join(workspacePath, '.labflow');

  if (fs.existsSync(stateRoot)) {
    for (const entry of fs.readdirSync(stateRoot).sort()) {
      const target = path.join(stateRoot, entry);
      if (fs.statSync(target).isFile()) {
        files[path.join('.labflow', entry)] = fs.readFileSync(target, 'utf8');
      }
    }
  }

  const snapshot = {
    label,
    workspacePath,
    files
  };

  snapshots.push(snapshot);

  fs.writeFileSync(
    path.join(snapshotDir, `${label}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`
  );
}

function pushCheck(name, fn) {
  try {
    fn();
    checks.push({ name, status: 'passed' });
  } catch (error) {
    checks.push({ name, status: 'failed', error: error.message });
    throw error;
  }
}

function writeArtifacts(payload) {
  fs.mkdirSync(artifactDir, { recursive: true });

  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(payload));

  fs.writeFileSync(
    path.join(artifactDir, 'transcripts.json'),
    `${JSON.stringify(transcripts, null, 2)}\n`
  );
}

function renderMarkdown(payload) {
  const lines = [
    '# LabFlow Proof Verify',
    '',
    `- status: **${payload.status}**`,
    `- repo root: \`${payload.repoRoot}\``,
    `- temp workspace: \`${payload.workspace}\``,
    `- artifact dir: \`${artifactDir}\``
  ];

  if (payload.failureMessage) {
    lines.push(`- failure: \`${payload.failureMessage}\``);
  }

  lines.push('', '## Checks');

  for (const check of payload.checks) {
    if (check.status === 'passed') {
      lines.push(`- ${check.name}: passed`);
    } else {
      lines.push(`- ${check.name}: failed — ${check.error}`);
    }
  }

  lines.push('', '## Snapshot files');

  if (snapshots.length === 0) {
    lines.push('- none');
  } else {
    for (const snapshot of snapshots) {
      lines.push(`- ${snapshot.label}.json`);
    }
  }

  lines.push('', '## Transcript names');

  for (const key of Object.keys(transcripts).sort()) {
    lines.push(`- ${key}`);
  }

  lines.push('');

  return `${lines.join('\n')}\n`;
}

const checks = [];
const transcripts = {};
const snapshots = [];

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'labflow-proof-'));
const now = new Date().toISOString().replace(/[:.]/g, '-');
const artifactBase = `${now}-${mode}`;
const artifactDir = path.join(outDir, artifactBase);
const snapshotDir = path.join(artifactDir, 'snapshots');
const jsonPath = `${artifactDir}.json`;
const markdownPath = `${artifactDir}.md`;

fs.mkdirSync(snapshotDir, { recursive: true });

let runStatus = 'passed';
let failureMessage = null;

try {
  pushCheck('help surface', () => {
    const help = recordTranscript('help', runCli(['--help']));
    assert(help.status === 0, `help exited with ${help.status}`);

    for (const command of manifest.stableCommands) {
      assert(help.stdout.includes(`- ${command} [`), `help missing stable command: ${command}`);
    }

    assert(
      help.stdout.includes('task add|list|show|done|reopen|remove'),
      'help missing task subcommands'
    );

    assert(
      help.stdout.includes('Public npm install is live.') &&
        help.stdout.includes('Local packed install and npm publish have been verified.'),
      'help missing install truth note'
    );
  });

  pushCheck('doctor json identity', () => {
    const doctor = recordTranscript('doctorJson', runCli(['doctor', '--json']));
    assert(doctor.status === 0, `doctor exited with ${doctor.status}`);
    assert(doctor.stderr === '', 'doctor should not write stderr');

    const payload = parseJsonOutput(doctor, 'doctor');
    assert(payload.product.productName === manifest.identity.productName, 'doctor product identity drift');
    assert(payload.product.packageName === manifest.identity.packageName, 'doctor package identity drift');
    assert(payload.product.cliName === manifest.identity.cliName, 'doctor cli identity drift');
    assert(payload.privatePackage === false, 'doctor privatePackage drift');
  });

  pushCheck('status before init', () => {
    const statusBeforeInit = recordTranscript('statusBeforeInit', runCli(['status', '--json'], workspace));
    assert(statusBeforeInit.status === 0, `status before init exited with ${statusBeforeInit.status}`);
    assert(statusBeforeInit.stderr === '', 'status before init should not write stderr');

    const payload = parseJsonOutput(statusBeforeInit, 'status before init');
    assert(payload.initialized === false, 'status before init should show initialized false');
    assert(Array.isArray(payload.stateIssues), 'status before init should include stateIssues array');
  });

  pushCheck('init first run', () => {
    const initFirst = recordTranscript('initFirst', runCli(['init', '--json'], workspace));
    assert(initFirst.status === 0, `init first run exited with ${initFirst.status}`);
    assert(initFirst.stderr === '', 'init first run should not write stderr');

    const payload = parseJsonOutput(initFirst, 'init first run');
    assert(payload.idempotent === false, 'first init should not be idempotent');
    assert(payload.created.length >= 1, 'first init should create state files');

    recordSnapshot('after-init-first', workspace);
  });

  pushCheck('init second run is idempotent', () => {
    const initSecond = recordTranscript('initSecond', runCli(['init', '--json'], workspace));
    assert(initSecond.status === 0, `init second run exited with ${initSecond.status}`);
    assert(initSecond.stderr === '', 'init second run should not write stderr');

    const payload = parseJsonOutput(initSecond, 'init second run');
    assert(payload.idempotent === true, 'second init should be idempotent');
    assert(payload.created.length === 0, 'second init should not create files');
  });

  pushCheck('task lifecycle', () => {
    const taskAddA = recordTranscript(
      'taskAddA',
      runCli(['task', 'add', 'Ship release hardening', '--json'], workspace)
    );
    const taskAddB = recordTranscript(
      'taskAddB',
      runCli(['task', 'add', 'Document state contract', '--json'], workspace)
    );

    assert(taskAddA.status === 0, 'task add A should succeed');
    assert(taskAddB.status === 0, 'task add B should succeed');

    const addedA = parseJsonOutput(taskAddA, 'task add A').task;
    const addedB = parseJsonOutput(taskAddB, 'task add B').task;

    assert(addedA && addedA.id, 'task add A should return task with id');
    assert(addedB && addedB.id, 'task add B should return task with id');

    const taskShow = recordTranscript(
      'taskShow',
      runCli(['task', 'show', addedA.id, '--json'], workspace)
    );
    assert(taskShow.status === 0, 'task show should succeed');
    assert(parseJsonOutput(taskShow, 'task show').task.id === addedA.id, 'task show id drift');

    const invalidTask = recordTranscript(
      'taskInvalidDone',
      runCli(['task', 'done', 'task-999'], workspace)
    );
    assert(invalidTask.status === 1, `invalid task should exit 1, got ${invalidTask.status}`);
    assert(invalidTask.stdout === '', 'invalid task should not write stdout');
    assert(invalidTask.stderr.includes('Task not found:'), 'invalid task stderr drift');

    const taskDone = recordTranscript(
      'taskDone',
      runCli(['task', 'done', addedA.id, '--json'], workspace)
    );
    assert(taskDone.status === 0, 'task done should succeed');
    assert(parseJsonOutput(taskDone, 'task done').task.status === 'done', 'task done should set done status');

    const taskReopen = recordTranscript(
      'taskReopen',
      runCli(['task', 'reopen', addedA.id, '--json'], workspace)
    );
    assert(taskReopen.status === 0, 'task reopen should succeed');
    assert(parseJsonOutput(taskReopen, 'task reopen').task.status === 'open', 'task reopen should set open status');

    const taskRemove = recordTranscript(
      'taskRemove',
      runCli(['task', 'remove', addedB.id, '--json'], workspace)
    );
    assert(taskRemove.status === 0, 'task remove should succeed');
    assert(parseJsonOutput(taskRemove, 'task remove').removed.id === addedB.id, 'task remove should remove the requested task');

    const taskList = recordTranscript(
      'taskList',
      runCli(['task', 'list', '--json'], workspace)
    );
    assert(taskList.status === 0, 'task list should succeed');

    const listed = parseJsonOutput(taskList, 'task list').items;
    assert(Array.isArray(listed), 'task list should return items array');
    assert(listed.some((item) => item.id === addedA.id), 'task list should still include reopened task');

    recordSnapshot('after-task-lifecycle', workspace);
  });

  pushCheck('session lifecycle', () => {
    const sessionStart = recordTranscript(
      'sessionStart',
      runCli(['session', 'start', 'Release wave', '--replace', '--json'], workspace)
    );
    assert(sessionStart.status === 0, 'session start should succeed');

    const started = parseJsonOutput(sessionStart, 'session start').session;
    assert(started && started.id, 'session start should return session with id');

    const sessionShow = recordTranscript(
      'sessionShow',
      runCli(['session', 'show', '--json'], workspace)
    );
    assert(sessionShow.status === 0, 'session show should succeed');
    assert(parseJsonOutput(sessionShow, 'session show').active?.id === started.id, 'session show id drift');

    const sessionClose = recordTranscript(
      'sessionClose',
      runCli(['session', 'close', 'Done for now', '--json'], workspace)
    );
    assert(sessionClose.status === 0, 'session close should succeed');

    const sessionHistory = recordTranscript(
      'sessionHistory',
      runCli(['session', 'history', '--json'], workspace)
    );
    assert(sessionHistory.status === 0, 'session history should succeed');

    const historyItems = parseJsonOutput(sessionHistory, 'session history').items;
    assert(Array.isArray(historyItems), 'session history should return items array');
    assert(historyItems.length >= 1, 'session history should contain at least one session');

    recordSnapshot('after-session-lifecycle', workspace);
  });

  pushCheck('memory lifecycle', () => {
    const memoryAppend = recordTranscript(
      'memoryAppend',
      runCli(['memory', 'append', 'Release note captured', '--tag', 'release', '--json'], workspace)
    );
    assert(memoryAppend.status === 0, 'memory append should succeed');

    const entry = parseJsonOutput(memoryAppend, 'memory append').entry;
    assert(entry && entry.id, 'memory append should return entry with id');

    const memoryShow = recordTranscript(
      'memoryShow',
      runCli(['memory', 'show', '--json'], workspace)
    );
    assert(memoryShow.status === 0, 'memory show should succeed');

    const payload = parseJsonOutput(memoryShow, 'memory show');
    assert(Array.isArray(payload.entries), 'memory show should return entries array');
    assert(payload.entries.length >= 1, 'memory show should contain at least one entry');

    recordSnapshot('after-memory-lifecycle', workspace);
  });

  pushCheck('status after init', () => {
    const statusAfterInit = recordTranscript('statusAfterInit', runCli(['status', '--json'], workspace));
    assert(statusAfterInit.status === 0, 'status after init should succeed');

    const payload = parseJsonOutput(statusAfterInit, 'status after init');
    assert(payload.initialized === true, 'status after init should show initialized true');
    assert(payload.supportedSchemaVersion >= 1, 'supported schema version should be present');
  });
} catch (error) {
  runStatus = 'failed';
  failureMessage = error.message;
}

const payload = {
  mode,
  status: runStatus,
  repoRoot,
  workspace,
  checks,
  failureMessage,
  transcripts,
  snapshots
};

writeArtifacts(payload);

console.log(
  JSON.stringify(
    {
      status: runStatus,
      json: jsonPath,
      markdown: markdownPath,
      artifactDir
    },
    null,
    2
  )
);

if (runStatus !== 'passed') {
  process.exit(1);
}
