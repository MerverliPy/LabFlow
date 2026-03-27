#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveManifest,
  getWorkspaceRoot,
  readCurrentPhase,
  findLatestProofArtifact,
  implementationCounts
} from '../../core/src/index.mjs';

import {
  initWorkspace,
  isInitialized,
  migrateWorkspaceState,
  inspectWorkspaceState,
  readTasks,
  findTask,
  addTask,
  completeTask,
  reopenTask,
  removeTask,
  readSession,
  startSession,
  closeSession,
  appendMemoryNote,
  readMemoryEntries,
  readMemorySummary,
  summarizeWorkspace,
  workspaceStateDir,
  SUPPORTED_STATE_SCHEMA_VERSION
} from '../../memory/src/index.mjs';

const LEGACY_BINARIES = ['ruflo', 'claude-flow'];
const EXIT_USAGE = 1;
const EXIT_STATE = 2;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const { repoRoot, manifest, manifestPath } = resolveManifest([
  process.cwd(),
  scriptDir,
  path.join(scriptDir, '..'),
  path.join(scriptDir, '..', '..'),
  path.join(scriptDir, '..', '..', '..')
]);

const workspaceRoot = getWorkspaceRoot(process.cwd());

function executableExists(name) {
  const pathEntries = (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  const pathext = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
    .split(';')
    .filter(Boolean);

  for (const entry of pathEntries) {
    const direct = path.join(entry, name);
    if (fs.existsSync(direct)) return true;

    for (const ext of pathext) {
      const candidate = path.join(entry, `${name}${ext}`);
      if (fs.existsSync(candidate)) return true;
    }
  }

  return false;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function fail(message, code = EXIT_USAGE) {
  console.error(message);
  process.exit(code);
}

function parseCommonFlags(args) {
  const json = args.includes('--json');
  return {
    json,
    args: args.filter((value) => value !== '--json')
  };
}

function takeOption(args, optionName) {
  const nextArgs = [];
  let value = null;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === optionName) {
      value = args[i + 1] ?? null;
      i += 1;
      continue;
    }
    nextArgs.push(args[i]);
  }

  return { args: nextArgs, value };
}

function formatTask(task) {
  return `${task.id} :: ${task.status} :: ${task.title}`;
}

function resolveDisplayedRepoPhase() {
  const phase = readCurrentPhase(repoRoot);
  const inNodeModules = repoRoot.split(path.sep).includes('node_modules');
  return phase === 'unknown' && inNodeModules ? 'published package' : phase;
}

function normalizeTaskCollection(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function normalizeSessionState(value) {
  if (!value) return { active: null, history: [] };
  if (Array.isArray(value)) return { active: null, history: value };

  const active = value.active ?? value.activeSession ?? null;
  const history =
    value.history ?? value.historyItems ?? value.closedSessions ?? [];

  if (
    'active' in value ||
    'activeSession' in value ||
    'history' in value ||
    'historyItems' in value ||
    'closedSessions' in value
  ) {
    return {
      active,
      history: Array.isArray(history) ? history : []
    };
  }

  return { active: value, history: [] };
}

function normalizeSessionStartResult(value, replace) {
  if (!value) {
    return {
      session: null,
      started: false,
      conflict: false,
      replaced: false
    };
  }

  if (
    typeof value === 'object' &&
    ('session' in value ||
      'started' in value ||
      'conflict' in value ||
      'replaced' in value)
  ) {
    return {
      session: value.session ?? null,
      started: value.started ?? Boolean(value.session),
      conflict: value.conflict ?? false,
      replaced: value.replaced ?? replace
    };
  }

  return {
    session: value,
    started: true,
    conflict: false,
    replaced: replace
  };
}

function shouldRetryCompat(error) {
  if (!error) return false;
  if (error instanceof TypeError) return true;

  const message = String(error.message || error);
  return (
    message.includes('argument') ||
    message.includes('options') ||
    message.includes('replace') ||
    message.includes('tag')
  );
}

function callWithCompat(attempts) {
  let lastError = null;

  for (let i = 0; i < attempts.length; i += 1) {
    try {
      return attempts[i]();
    } catch (error) {
      lastError = error;
      if (!shouldRetryCompat(error) || i === attempts.length - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

function blockingIssuesFor(scope) {
  const inspection = inspectWorkspaceState(workspaceRoot);
  return inspection.issues.filter((issue) => {
    if (
      issue.code === 'unsupported-schema-version' ||
      issue.code === 'missing-schema-version' ||
      issue.code === 'corrupted-meta'
    ) {
      return true;
    }

    if (scope === 'task')
      return issue.code.includes('tasks') || issue.code === 'missing-meta';
    if (scope === 'session')
      return issue.code.includes('session') || issue.code === 'missing-meta';
    if (scope === 'memory') return issue.code === 'missing-meta';

    return false;
  });
}

function requireInitialized(commandName) {
  if (isInitialized(workspaceRoot)) return;
  fail(
    `Workspace is not initialized. Run 'labflow init' before '${commandName}'.`,
    EXIT_USAGE
  );
}

function requireHealthyState(scope) {
  const issues = blockingIssuesFor(scope);
  if (issues.length === 0) return;

  const lead = issues[0];
  fail(
    `Workspace state is not healthy for '${scope}'. ${lead.message} Run 'labflow status --json' or 'labflow init' to inspect and repair missing files.`,
    EXIT_STATE
  );
}

function buildStatusPayload() {
  const summary = summarizeWorkspace(workspaceRoot);
  const counts = implementationCounts(manifest);
  const latestProof = findLatestProofArtifact(repoRoot);

  return {
    product: manifest.identity.productName,
    workspaceRoot,
    stateDir: workspaceStateDir(workspaceRoot),
    initialized: summary.initialized,
    repoPhase: resolveDisplayedRepoPhase(),
    schemaVersion: summary.schemaVersion,
    supportedSchemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    implementation: counts,
    tasks: {
      open: summary.openTaskCount,
      total: summary.taskCount
    },
    memory: {
      notes: summary.memoryNotes
    },
    session: {
      active: summary.activeSession,
      historyCount: summary.sessionHistoryCount
    },
    stateIssues: summary.stateIssues ?? [],
    latestProofArtifact: latestProof ? latestProof.name : null
  };
}

function printHelp() {
  console.log('labflow <command> [options]');
  console.log('');
  console.log('Stable command surface:');

  for (const name of manifest.stableCommands) {
    const summary = manifest.commandSummary?.[name] || '';
    const status = manifest.commandStatus?.[name] || 'planned';
    console.log(`- ${name} [${status}] :: ${summary}`);
  }

  console.log('');
  console.log('Notable subcommands:');
  console.log('- task add|list|show|done|reopen|remove [--json]');
  console.log('- session start|show|history|close [--json] [--replace]');
  console.log('- memory append|show [--json] [--tag <tag>]');
  console.log('- status [--json]');
  console.log('- doctor [--json]');
  console.log('');
  console.log('Current repo phase:');
  console.log(`- ${resolveDisplayedRepoPhase()}`);
  console.log(
    '- Local packed install has been verified. Public npm publish is live.'
  );
}

function printDoctor(json = false) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
  );
  const legacyBinaries = LEGACY_BINARIES.filter(executableExists);

  const payload = {
    product: manifest.identity,
    workspaceRoot,
    stateDir: workspaceStateDir(workspaceRoot),
    repoRoot,
    manifestPath,
    nodeVersion: process.version,
    platform: `${os.platform()} ${os.release()}`,
    packageManager: packageJson.packageManager || null,
    privatePackage: false,
    supportedSchemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    legacyBinaries
  };

  if (json) {
    printJson(payload);
    return;
  }

  console.log('LabFlow doctor');
  console.log(`Expected product name: ${manifest.identity.productName}`);
  console.log(`Expected package name: ${manifest.identity.packageName}`);
  console.log(`Expected CLI name: ${manifest.identity.cliName}`);
  console.log(`Workspace root: ${workspaceRoot}`);
  console.log(`Workspace state dir: ${workspaceStateDir(workspaceRoot)}`);
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Manifest path: ${manifestPath}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Platform: ${payload.platform}`);
  console.log(`Package manager: ${payload.packageManager || 'unset'}`);
  console.log(`Private package mode: ${payload.privatePackage ? 'yes' : 'no'}`);
  console.log(`Supported state schema: ${SUPPORTED_STATE_SCHEMA_VERSION}`);

  if (legacyBinaries.length === 0) {
    console.log('No known legacy binaries detected in PATH.');
    return;
  }

  for (const name of legacyBinaries) {
    console.log(`Hard warning: old binary detected: ${name}`);
    console.log(
      `Remove it with: npm uninstall -g ${name} || pnpm remove -g ${name}`
    );
  }
}

function printInit(json = false) {
  const migration = migrateWorkspaceState(workspaceRoot);
  const result = initWorkspace(workspaceRoot, manifest);
  const idempotent = result.created.length === 0;

  const payload = {
    workspaceRoot,
    stateDir: result.stateDir,
    created: result.created.map((filePath) =>
      path.relative(workspaceRoot, filePath)
    ),
    existing: result.existing.map((filePath) =>
      path.relative(workspaceRoot, filePath)
    ),
    idempotent,
    migration
  };

  if (json) {
    printJson(payload);
    return;
  }

  console.log(`Initialized workspace state at: ${result.stateDir}`);
  console.log(
    idempotent
      ? 'Workspace already had state files; no new files were created.'
      : 'Workspace state files are ready.'
  );

  if (migration.migrated) {
    console.log(
      `Migrated schema version ${migration.fromVersion} -> ${migration.toVersion}`
    );
  }

  console.log(`Created files: ${result.created.length}`);
  for (const filePath of result.created) {
    console.log(`- created :: ${path.relative(workspaceRoot, filePath)}`);
  }

  console.log(`Existing files: ${result.existing.length}`);
  for (const filePath of result.existing) {
    console.log(`- existing :: ${path.relative(workspaceRoot, filePath)}`);
  }
}

function printStatus(json = false) {
  const payload = buildStatusPayload();

  if (json) {
    printJson(payload);
    return;
  }

  console.log('LabFlow status');
  console.log(`Workspace root: ${payload.workspaceRoot}`);
  console.log(`Initialized: ${payload.initialized ? 'yes' : 'no'}`);
  console.log(`Repo phase: ${payload.repoPhase}`);
  console.log(
    `State schema: ${payload.schemaVersion ?? 'none'} / supported ${payload.supportedSchemaVersion}`
  );
  console.log(`Implemented commands: ${payload.implementation.implemented}`);
  console.log(`Minimal commands: ${payload.implementation.minimal}`);
  console.log(`Open tasks: ${payload.tasks.open}`);
  console.log(`Total tasks: ${payload.tasks.total}`);
  console.log(`Memory notes: ${payload.memory.notes}`);
  console.log(
    `Active session: ${
      payload.session.active
        ? `${payload.session.active.id} (${payload.session.active.label})`
        : 'none'
    }`
  );
  console.log(`Session history: ${payload.session.historyCount}`);
  console.log(
    `Latest proof artifact: ${payload.latestProofArtifact || 'none found'}`
  );
  console.log(`State issues: ${payload.stateIssues.length}`);

  for (const issue of payload.stateIssues) {
    console.log(`- ${issue.code} :: ${issue.message}`);
  }
}

function startSessionWithFallback(label, replace) {
  return callWithCompat([
    () => startSession(workspaceRoot, label, { replace }),
    () => startSession(workspaceRoot, label, replace),
    () => startSession(workspaceRoot, label)
  ]);
}

function closeSessionWithFallback(summaryText) {
  return callWithCompat([
    () => closeSession(workspaceRoot, summaryText),
    () => closeSession(workspaceRoot)
  ]);
}

function appendMemoryNoteWithFallback(note, tag) {
  return callWithCompat([
    () => appendMemoryNote(workspaceRoot, note, { tag }),
    () => appendMemoryNote(workspaceRoot, note, tag),
    () => appendMemoryNote(workspaceRoot, note)
  ]);
}

function runTask(subcommand, rest) {
  requireInitialized('task');
  requireHealthyState('task');

  const { json, args } = parseCommonFlags(rest);

  if (!subcommand || subcommand === 'list') {
    const items = normalizeTaskCollection(readTasks(workspaceRoot));

    if (json) {
      printJson({ items });
      return;
    }

    if (items.length === 0) {
      console.log('No tasks recorded.');
      return;
    }

    for (const item of items) {
      console.log(formatTask(item));
    }

    return;
  }

  if (subcommand === 'add') {
    const title = args.join(' ').trim();
    if (!title) fail('Usage: labflow task add <title>');

    const task = addTask(workspaceRoot, title);

    if (json) {
      printJson({ task });
      return;
    }

    console.log(`Added task: ${formatTask(task)}`);
    return;
  }

  if (subcommand === 'show') {
    const id = args[0];
    if (!id) fail('Usage: labflow task show <task-id>');

    const task = findTask(workspaceRoot, id);
    if (!task) fail(`Task not found: ${id}`);

    if (json) {
      printJson({ task });
      return;
    }

    console.log(formatTask(task));
    return;
  }

  if (subcommand === 'done') {
    const id = args[0];
    if (!id) fail('Usage: labflow task done <task-id>');

    const task = completeTask(workspaceRoot, id);
    if (!task) fail(`Task not found: ${id}`);

    if (json) {
      printJson({ task });
      return;
    }

    console.log(`Completed task: ${formatTask(task)}`);
    return;
  }

  if (subcommand === 'reopen') {
    const id = args[0];
    if (!id) fail('Usage: labflow task reopen <task-id>');

    const task = reopenTask(workspaceRoot, id);
    if (!task) fail(`Task not found: ${id}`);

    if (json) {
      printJson({ task });
      return;
    }

    console.log(`Reopened task: ${formatTask(task)}`);
    return;
  }

  if (subcommand === 'remove') {
    const id = args[0];
    if (!id) fail('Usage: labflow task remove <task-id>');

    const removed = removeTask(workspaceRoot, id);
    if (!removed) fail(`Task not found: ${id}`);

    if (json) {
      printJson({ removed });
      return;
    }

    console.log(`Removed task: ${formatTask(removed)}`);
    return;
  }

  fail(`Unknown task subcommand: ${subcommand}`);
}

function runSession(subcommand, rest) {
  requireInitialized('session');
  requireHealthyState('session');

  const parsed = parseCommonFlags(rest);
  const replace = parsed.args.includes('--replace');
  const baseArgs = parsed.args.filter((value) => value !== '--replace');

  if (!subcommand || subcommand === 'show') {
    const state = normalizeSessionState(readSession(workspaceRoot));

    if (parsed.json) {
      printJson({ session: state.active, active: state.active });
      return;
    }

    if (!state.active) {
      console.log('No active session.');
      return;
    }

    console.log(`Active session: ${state.active.id} :: ${state.active.label}`);
    return;
  }

  if (subcommand === 'start') {
    const label = baseArgs.join(' ').trim();
    if (!label) fail('Usage: labflow session start <label> [--replace]');

    const result = normalizeSessionStartResult(
      startSessionWithFallback(label, replace),
      replace
    );

    if (result.conflict && !replace) {
      fail('Active session already exists');
    }

    if (!result.session || !result.session.id) {
      fail('Session start failed to return session with id');
    }

    if (parsed.json) {
      printJson({
        session: result.session,
        started: result.started,
        conflict: result.conflict,
        replaced: result.replaced
      });
      return;
    }

    console.log(
      `Started session: ${result.session.id} :: ${result.session.label}`
    );
    return;
  }

  if (subcommand === 'history') {
    const state = normalizeSessionState(readSession(workspaceRoot));
    const history = state.history;

    if (parsed.json) {
      printJson({ history, items: history });
      return;
    }

    if (history.length === 0) {
      console.log('No session history.');
      return;
    }

    for (const item of history) {
      console.log(`${item.id} :: ${item.label}`);
    }

    return;
  }

  if (subcommand === 'close') {
    const summaryText = baseArgs.join(' ').trim() || null;
    const closed = closeSessionWithFallback(summaryText);

    if (parsed.json) {
      printJson({ closed });
      return;
    }

    if (!closed) {
      console.log('No active session to close.');
      return;
    }

    console.log(`Closed session: ${closed.id} :: ${closed.label}`);
    return;
  }

  fail(`Unknown session subcommand: ${subcommand}`);
}

function runMemory(subcommand, rest) {
  requireInitialized('memory');
  requireHealthyState('memory');

  const common = parseCommonFlags(rest);
  const { args: argsWithoutTag, value: tag } = takeOption(common.args, '--tag');

  if (!subcommand || subcommand === 'show') {
    const entriesRaw = readMemoryEntries(workspaceRoot);
    const entries = Array.isArray(entriesRaw)
      ? entriesRaw
      : (entriesRaw?.items ?? []);
    const summary = readMemorySummary(workspaceRoot);

    if (common.json) {
      printJson({ entries, summary });
      return;
    }

    if (entries.length === 0) {
      console.log('No memory notes recorded.');
      return;
    }

    for (const entry of entries) {
      const prefix = entry.tag ? `[${entry.tag}] ` : '';
      console.log(`${entry.id} :: ${prefix}${entry.text}`);
    }

    return;
  }

  if (subcommand === 'append') {
    const text = argsWithoutTag.join(' ').trim();
    if (!text) fail('Usage: labflow memory append <text> [--tag <tag>]');

    const memoryResult = appendMemoryNoteWithFallback(text, tag);
    const entry = memoryResult?.entry ?? memoryResult;

    if (common.json) {
      printJson({ entry });
      return;
    }

    const prefix = entry.tag ? `[${entry.tag}] ` : '';
    console.log(`Added memory note: ${entry.id} :: ${prefix}${entry.text}`);
    return;
  }

  fail(`Unknown memory subcommand: ${subcommand}`);
}

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1);

if (
  !command ||
  command === '--help' ||
  command === '-h' ||
  command === 'help'
) {
  printHelp();
  process.exit(0);
}

if (command === 'doctor') {
  const { json } = parseCommonFlags(rest);
  printDoctor(json);
  process.exit(0);
}

if (command === 'status') {
  const { json } = parseCommonFlags(rest);
  printStatus(json);
  process.exit(0);
}

if (command === 'init') {
  const { json } = parseCommonFlags(rest);
  printInit(json);
  process.exit(0);
}

if (command === 'task') {
  runTask(rest[0], rest.slice(1));
  process.exit(0);
}

if (command === 'session') {
  runSession(rest[0], rest.slice(1));
  process.exit(0);
}

if (command === 'memory') {
  runMemory(rest[0], rest.slice(1));
  process.exit(0);
}

if (!manifest.stableCommands.includes(command)) {
  fail(`Unknown or non-stable command: ${command}`);
}

console.log(`Scaffold only: implement '${command}' behavior in Phase 2.`);
