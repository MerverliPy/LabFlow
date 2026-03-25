import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findRepoRoot } from '../../core/src/index.mjs';

const mode = process.argv[2] || 'verify';

const repoRoot = findRepoRoot(process.cwd()) || findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
if (!repoRoot) {
  console.error('proof verify failed: repo root not found');
  process.exit(1);
}

const outDir = path.join(repoRoot, 'verification', 'runs');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'stable-command-manifest.json'), 'utf8'));
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
    throw new Error(`${label} did not emit valid JSON: ${error.message}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
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
  fs.writeFileSync(path.join(snapshotDir, `${label}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
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

const checks = [];
const transcripts = {};
const snapshots = [];
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'labflow-proof-'));
const now = new Date().toISOString().replace(/[:.]/g, '-');
const artifactBase = `${now}-verify`;
const artifactDir = path.join(outDir, artifactBase);
const snapshotDir = path.join(artifactDir, 'snapshots');
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
    assert(help.stdout.includes('task add|list|show|done|reopen|remove'), 'help missing task subcommands');
    assert(help.stdout.includes('Public npm / npx install is intentionally disabled'), 'help missing install truth note');
  });

  pushCheck('doctor json identity', () => {
    const doctor = recordTranscript('doctorJson', runCli(['doctor', '--json']));
    assert(doctor.status === 0, `doctor exited with ${doctor.status}`);
    assert(doctor.stderr === '', 'doctor should not write stderr');
    const payload = parseJsonOutput(doctor, 'doctor');
    assert(payload.product.productName === manifest.identity.productName, 'doctor product identity drift');
    assert(payload.product.packageName === manifest.identity.packageName, 'doctor package identity drift');
    assert(payload.product.cliName === manifest.identity.cliName, 'doctor cli identity drift');
    assert(payload.privatePackage === true, 'doctor privatePackage drift');
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
    assert(payload.created.length >= 4, 'first init should create all state files');
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

  pushCheck('task lifecycle with failures', () => {
    const taskAddA = recordTranscript('taskAddA', runCli(['task', 'add', 'Ship release hardening', '--json'], workspace));
    const taskAddB = recordTranscript('taskAddB', runCli(['task', 'add', 'Document state contract', '--json'], workspace));
    assert(taskAddA.status === 0 && taskAddB.status === 0, 'task add should succeed');
    const addedA = parseJsonOutput(taskAddA, 'task add A').task;
    const addedB = parseJsonOutput(taskAddB, 'task add B').task;
    assert(addedA.id === 'task-001', 'first task id drifted');
    assert(addedB.id === 'task-002', 'second task id drifted');

    const taskShow = recordTranscript('taskShow', runCli(['task', 'show', 'task-001', '--json'], workspace));
    assert(taskShow.status === 0, 'task show should succeed');
    assert(parseJsonOutput(taskShow, 'task show').task.title === 'Ship release hardening', 'task show title drift');

    const invalidTask = recordTranscript('taskInvalidDone', runCli(['task', 'done', 'task-999'], workspace));
    assert(invalidTask.status === 1, `invalid task should exit 1, got ${invalidTask.status}`);
    assert(invalidTask.stdout === '', 'invalid task should not write stdout');
    assert(invalidTask.stderr.includes('Task not found: task-999'), 'invalid task stderr drift');

    const taskDone = recordTranscript('taskDone', runCli(['task', 'done', 'task-001', '--json'], workspace));
    assert(taskDone.status === 0, 'task done should succeed');
    assert(parseJsonOutput(taskDone, 'task done').task.status === 'done', 'task done should set done status');

    const taskReopen = recordTranscript('taskReopen', runCli(['task', 'reopen', 'task-001', '--json'], workspace));
    assert(taskReopen.status === 0, 'task reopen should succeed');
    assert(parseJsonOutput(taskReopen, 'task reopen').task.status === 'open', 'task reopen should set open status');

    const taskRemove = recordTranscript('taskRemove', runCli(['task', 'remove', 'task-002', '--json'], workspace));
    assert(taskRemove.status === 0, 'task remove should succeed');
    assert(parseJsonOutput(taskRemove, 'task remove').removed.id === 'task-002', 'task remove should remove task-002');

    const taskList = recordTranscript('taskList', runCli(['task', 'list', '--json'], workspace));
    assert(taskList.status === 0, 'task list should succeed');
    const listed = parseJsonOutput(taskList, 'task list').items;
    assert(listed.length === 1, 'task list should contain one remaining task');
    recordSnapshot('after-task-lifecycle', workspace);
  });

  pushCheck('session lifecycle with conflict', () => {
    const sessionStart = recordTranscript('sessionStart', runCli(['session', 'start', 'phase-3-hardening', '--json'], workspace));
    assert(sessionStart.status === 0, 'session start should succeed');
    const started = parseJsonOutput(sessionStart, 'session start').session;
    assert(started.label === 'phase-3-hardening', 'session label drift');

    const sessionConflict = recordTranscript('sessionConflict', runCli(['session', 'start', 'parallel-attempt'], workspace));
    assert(sessionConflict.status === 1, `session conflict should exit 1, got ${sessionConflict.status}`);
    assert(sessionConflict.stdout === '', 'session conflict should not write stdout');
    assert(sessionConflict.stderr.includes('Active session already exists'), 'session conflict stderr drift');

    const sessionReplace = recordTranscript('sessionReplace', runCli(['session', 'start', '--replace', 'phase-3-replaced', '--json'], workspace));
    assert(sessionReplace.status === 0, 'session replace should succeed');
    assert(parseJsonOutput(sessionReplace, 'session replace').replaced === true, 'session replace should report replaced');

    const sessionHistory = recordTranscript('sessionHistory', runCli(['session', 'history', '--json'], workspace));
    assert(sessionHistory.status === 0, 'session history should succeed');
    assert(parseJsonOutput(sessionHistory, 'session history').history.length === 1, 'session history should contain replaced session');

    const sessionClose = recordTranscript('sessionClose', runCli(['session', 'close', '--json'], workspace));
    assert(sessionClose.status === 0, 'session close should succeed');
    assert(parseJsonOutput(sessionClose, 'session close').closed.endedReason === 'closed', 'session close reason drift');

    recordSnapshot('after-session-lifecycle', workspace);
  });

  pushCheck('memory ordering and tags', () => {
    const appendOne = recordTranscript('memoryAppendOne', runCli(['memory', 'append', '--tag', 'release', 'Lock docs before publish', '--json'], workspace));
    const appendTwo = recordTranscript('memoryAppendTwo', runCli(['memory', 'append', 'Proof failures should be replayable', '--json'], workspace));
    assert(appendOne.status === 0 && appendTwo.status === 0, 'memory append should succeed');
    const showMemory = recordTranscript('memoryShow', runCli(['memory', 'show', '--json'], workspace));
    assert(showMemory.status === 0, 'memory show should succeed');
    const payload = parseJsonOutput(showMemory, 'memory show');
    assert(payload.entries.length === 2, 'memory show should contain two entries');
    assert(payload.entries[0].tag === 'release', 'first memory tag drift');
    assert(payload.entries[0].text === 'Lock docs before publish', 'first memory text drift');
    assert(payload.entries[1].text === 'Proof failures should be replayable', 'second memory text drift');
    assert(payload.entries[0].timestamp <= payload.entries[1].timestamp, 'memory timestamps should be ordered');
    recordSnapshot('after-memory-notes', workspace);
  });

  pushCheck('status after workflow', () => {
    const statusAfter = recordTranscript('statusAfterWorkflow', runCli(['status', '--json'], workspace));
    assert(statusAfter.status === 0, 'status after workflow should succeed');
    const payload = parseJsonOutput(statusAfter, 'status after workflow');
    assert(payload.initialized === true, 'status after workflow should show initialized');
    assert(payload.tasks.total === 1, 'status after workflow total tasks drift');
    assert(payload.memory.notes === 2, 'status after workflow memory notes drift');
    assert(payload.session.active === null, 'status after workflow should have no active session');
    assert(payload.session.historyCount === 2, 'status after workflow session history drift');
  });

  pushCheck('corrupted state is reported and blocks task commands', () => {
    fs.writeFileSync(path.join(workspace, '.labflow', 'tasks.json'), '{broken');
    recordSnapshot('after-corrupting-tasks', workspace);

    const corruptedStatus = recordTranscript('statusCorruptedTasks', runCli(['status', '--json'], workspace));
    assert(corruptedStatus.status === 0, 'status should remain readable on corrupted tasks');
    const payload = parseJsonOutput(corruptedStatus, 'status corrupted tasks');
    assert(payload.stateIssues.some((issue) => issue.code === 'corrupted-tasks'), 'status should report corrupted-tasks issue');

    const blockedTask = recordTranscript('taskBlockedOnCorruption', runCli(['task', 'list'], workspace));
    assert(blockedTask.status === 2, `task on corrupted state should exit 2, got ${blockedTask.status}`);
    assert(blockedTask.stderr.includes('Workspace state is not healthy for'), 'task on corrupted state should explain blocking issue');
  });

  pushCheck('missing session file is reported and blocks session commands', () => {
    const recoveryInit = recordTranscript('recoveryInit', runCli(['init', '--json'], workspace));
    assert(recoveryInit.status === 0, 'recovery init should succeed');
    fs.rmSync(path.join(workspace, '.labflow', 'session.json'));
    recordSnapshot('after-removing-session-file', workspace);

    const missingSessionStatus = recordTranscript('statusMissingSession', runCli(['status', '--json'], workspace));
    assert(missingSessionStatus.status === 0, 'status should remain readable on missing session file');
    const payload = parseJsonOutput(missingSessionStatus, 'status missing session');
    assert(payload.stateIssues.some((issue) => issue.code === 'missing-session'), 'status should report missing-session issue');

    const blockedSession = recordTranscript('sessionBlockedOnMissingFile', runCli(['session', 'show'], workspace));
    assert(blockedSession.status === 2, `session on missing file should exit 2, got ${blockedSession.status}`);
    assert(blockedSession.stderr.includes('Workspace state is not healthy for'), 'session on missing file should explain blocking issue');
  });
} catch (error) {
  runStatus = 'failed';
  failureMessage = error.message;
}

const report = {
  mode,
  status: runStatus,
  repoRoot,
  workspace,
  checks,
  failureMessage,
  transcripts,
  snapshots
};

fs.writeFileSync(path.join(artifactDir, 'transcripts.json'), `${JSON.stringify(transcripts, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const jsonPath = path.join(outDir, `${artifactBase}.json`);
const mdPath = path.join(outDir, `${artifactBase}.md`);

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  mdPath,
  [
    '# LabFlow Proof Verify',
    '',
    `- status: **${report.status}**`,
    `- repo root: \`${repoRoot}\``,
    `- temp workspace: \`${workspace}\``,
    `- artifact dir: \`${artifactDir}\``,
    failureMessage ? `- failure: \`${failureMessage}\`` : '- failure: none',
    '',
    '## Checks',
    ...checks.map((check) => `- ${check.name}: ${check.status}${check.error ? ` — ${check.error}` : ''}`),
    '',
    '## Snapshot files',
    ...snapshots.map((snapshot) => `- \`${path.relative(repoRoot, path.join(snapshotDir, `${snapshot.label}.json`))}\``)
  ].join('\n') + '\n'
);

console.log(JSON.stringify({
  status: runStatus,
  json: jsonPath,
  markdown: mdPath,
  artifactDir
}, null, 2));

process.exit(runStatus === 'passed' ? 0 : 1);
