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
  ensureStateDir,
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
  workspaceFiles,
  SUPPORTED_STATE_SCHEMA_VERSION
} from '../../memory/src/index.mjs';

const LEGACY_BINARIES = ['ruflo', 'claude-flow'];
const EXIT_USAGE = 1;
const EXIT_STATE = 2;

function executableExists(name) {
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
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

function formatTask(task) {
  return `${task.id} :: ${task.status} :: ${task.title}`;
}

function blockingIssuesFor(scope) {
  const inspection = inspectWorkspaceState(workspaceRoot);
  const relevant = inspection.issues.filter((issue) => {
    if (issue.code === 'unsupported-schema-version' || issue.code === 'missing-schema-version' || issue.code === 'corrupted-meta') return true;
    if (scope === 'task') return issue.code.includes('tasks') || issue.code === 'missing-meta';
    if (scope === 'session') return issue.code.includes('session') || issue.code === 'missing-meta';
    if (scope === 'memory') return issue.code === 'missing-meta';
    return false;
  });
  return relevant;
}

function requireInitialized(commandName) {
  if (isInitialized(workspaceRoot)) return;
  fail(`Workspace is not initialized. Run 'labflow init' before '${commandName}'.`, EXIT_USAGE);
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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const { repoRoot, manifest, manifestPath } = resolveManifest([
  process.cwd(),
  scriptDir,
  path.join(scriptDir, '..'),
  path.join(scriptDir, '..', '..'),
  path.join(scriptDir, '..', '..', '..')
]);
const workspaceRoot = getWorkspaceRoot(process.cwd());

function buildStatusPayload() {
  const summary = summarizeWorkspace(workspaceRoot);
  const counts = implementationCounts(manifest);
  const latestProof = findLatestProofArtifact(repoRoot);
  return {
    product: manifest.identity.productName,
    workspaceRoot,
    stateDir: workspaceStateDir(workspaceRoot),
    initialized: summary.initialized,
    repoPhase: readCurrentPhase(repoRoot),
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
    stateIssues: summary.stateIssues,
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
  console.log(`- ${readCurrentPhase(repoRoot)}`);
  console.log('- Public npm / npx install is intentionally disabled until publish readiness is proven.');
}

function printDoctor(json = false) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
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
    privatePackage: packageJson.private === true,
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
    console.log(`Remove it with: npm uninstall -g ${name} || pnpm remove -g ${name}`);
  }
}

function printInit(json = false) {
  const migration = migrateWorkspaceState(workspaceRoot);
  const result = initWorkspace(workspaceRoot, manifest);
  const idempotent = result.created.length === 0;
  const payload = {
    workspaceRoot,
    stateDir: result.stateDir,
    created: result.created.map((filePath) => path.relative(workspaceRoot, filePath)),
    existing: result.existing.map((filePath) => path.relative(workspaceRoot, filePath)),
    idempotent,
    migration
  };

  if (json) {
    printJson(payload);
    return;
  }

  console.log(`Initialized workspace state at: ${result.stateDir}`);
  console.log(idempotent ? 'Workspace already had state files; no new files were created.' : 'Workspace state files are ready.');
  if (migration.migrated) {
    console.log(`Migrated schema version ${migration.fromVersion} -> ${migration.toVersion}`);
  }
  console.log(`Created files: ${result.created.length}`);
  for (const filePath of result.created) console.log(`- created :: ${path.relative(workspaceRoot, filePath)}`);
  console.log(`Existing files: ${result.existing.length}`);
  for (const filePath of result.existing) console.log(`- existing :: ${path.relative(workspaceRoot, filePath)}`);
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
  console.log(`State schema: ${payload.schemaVersion ?? 'none'} / supported ${payload.supportedSchemaVersion}`);
  console.log(`Implemented commands: ${payload.implementation.implemented}`);
  console.log(`Minimal commands: ${payload.implementation.minimal}`);
  console.log(`Open tasks: ${payload.tasks.open}`);
  console.log(`Total tasks: ${payload.tasks.total}`);
  console.log(`Memory notes: ${payload.memory.notes}`);
  console.log(`Active session: ${payload.session.active ? `${payload.session.active.id} (${payload.session.active.label})` : 'none'}`);
  console.log(`Session history: ${payload.session.historyCount}`);
  console.log(`Latest proof artifact: ${payload.latestProofArtifact || 'none found'}`);
  console.log(`State issues: ${payload.stateIssues.length}`);
  for (const issue of payload.stateIssues) console.log(`- ${issue.code} :: ${issue.message}`);
}

function runTask(subcommand, rest) {
  requireInitialized('task');
  requireHealthyState('task');
  const { json, args } = parseCommonFlags(rest);

  if (!subcommand || subcommand === 'list') {
    const items = readTasks(workspaceRoot).items;
    if (json) {
      printJson({ items });
      return;
    }
    if (items.length === 0) {
      console.log('No tasks recorded.');
      return;
    }
    for (const item of items) console.log(formatTask(item));
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
    console.log(`Added task ${task.id}: ${task.title}`);
    return;
  }

  if (subcommand === 'show') {
    const taskId = args[0];
    if (!taskId) fail('Usage: labflow task show <task-id>');
    const task = findTask(workspaceRoot, taskId);
    if (!task) fail(`Task not found: ${taskId}`);
    if (json) {
      printJson({ task });
      return;
    }
    console.log(formatTask(task));
    console.log(`Created at: ${task.createdAt}`);
    if (task.completedAt) console.log(`Completed at: ${task.completedAt}`);
    if (task.reopenedAt) console.log(`Reopened at: ${task.reopenedAt}`);
    return;
  }

  if (subcommand === 'done') {
    const taskId = args[0];
    if (!taskId) fail('Usage: labflow task done <task-id>');
    const task = completeTask(workspaceRoot, taskId);
    if (!task) fail(`Task not found: ${taskId}`);
    if (json) {
      printJson({ task });
      return;
    }
    console.log(`Completed task ${task.id}: ${task.title}`);
    return;
  }

  if (subcommand === 'reopen') {
    const taskId = args[0];
    if (!taskId) fail('Usage: labflow task reopen <task-id>');
    const task = reopenTask(workspaceRoot, taskId);
    if (!task) fail(`Task not found: ${taskId}`);
    if (json) {
      printJson({ task });
      return;
    }
    console.log(`Reopened task ${task.id}: ${task.title}`);
    return;
  }

  if (subcommand === 'remove') {
    const taskId = args[0];
    if (!taskId) fail('Usage: labflow task remove <task-id>');
    const task = removeTask(workspaceRoot, taskId);
    if (!task) fail(`Task not found: ${taskId}`);
    if (json) {
      printJson({ removed: task });
      return;
    }
    console.log(`Removed task ${task.id}: ${task.title}`);
    return;
  }

  fail(`Unknown task subcommand: ${subcommand}`);
}

function runSession(subcommand, rest) {
  requireInitialized('session');
  requireHealthyState('session');
  const { json, args } = parseCommonFlags(rest);

  if (!subcommand || subcommand === 'show') {
    const session = readSession(workspaceRoot);
    if (json) {
      printJson(session);
      return;
    }
    if (!session.active) {
      console.log(`No active session. Closed sessions: ${session.history.length}`);
      return;
    }
    console.log(`Active session: ${session.active.id} :: ${session.active.label} :: ${session.active.startedAt}`);
    console.log(`Closed sessions: ${session.history.length}`);
    return;
  }

  if (subcommand === 'history') {
    const session = readSession(workspaceRoot);
    if (json) {
      printJson({ history: session.history });
      return;
    }
    if (session.history.length === 0) {
      console.log('No closed sessions recorded.');
      return;
    }
    for (const item of session.history) {
      console.log(`${item.id} :: ${item.label} :: ${item.startedAt} -> ${item.endedAt}`);
    }
    return;
  }

  if (subcommand === 'start') {
    const replace = args.includes('--replace');
    const labelParts = args.filter((value) => value !== '--replace');
    const label = labelParts.join(' ').trim() || 'default';
    const result = startSession(workspaceRoot, label, { replace });
    if (!result.started) {
      fail(
        `Active session already exists: ${result.session.id} (${result.session.label}). Close it first or use 'labflow session start --replace <label>'.`
      );
    }
    if (json) {
      printJson({ session: result.session, replaced: replace });
      return;
    }
    console.log(`${replace ? 'Replaced with' : 'Started'} session ${result.session.id} :: ${result.session.label}`);
    return;
  }

  if (subcommand === 'close') {
    const closed = closeSession(workspaceRoot);
    if (!closed) {
      if (json) {
        printJson({ closed: null });
        return;
      }
      console.log('No active session to close.');
      return;
    }
    if (json) {
      printJson({ closed });
      return;
    }
    console.log(`Closed session ${closed.id} :: ${closed.label}`);
    return;
  }

  fail(`Unknown session subcommand: ${subcommand}`);
}

function runMemory(subcommand, rest) {
  requireInitialized('memory');
  requireHealthyState('memory');
  const { json, args } = parseCommonFlags(rest);

  if (!subcommand || subcommand === 'show') {
    const summary = readMemorySummary(workspaceRoot);
    const entries = readMemoryEntries(workspaceRoot);
    if (json) {
      printJson({
        path: summary.path,
        lines: summary.lines,
        notes: summary.notes,
        entries
      });
      return;
    }
    console.log(`Memory file: ${summary.path}`);
    console.log(`Lines: ${summary.lines}`);
    console.log(`Notes: ${summary.notes}`);
    if (entries.length > 0) {
      console.log('Entries:');
      for (const entry of entries) {
        const tagPart = entry.tag ? ` [tag:${entry.tag}]` : '';
        console.log(`- ${entry.timestamp}${tagPart} :: ${entry.text}`);
      }
    }
    return;
  }

  if (subcommand === 'append') {
    const tagIndex = args.indexOf('--tag');
    let tag = null;
    let payloadArgs = args;
    if (tagIndex !== -1) {
      tag = args[tagIndex + 1];
      if (!tag) fail('Usage: labflow memory append [--tag <tag>] <text>');
      payloadArgs = args.filter((_, index) => index !== tagIndex && index !== tagIndex + 1);
    }
    const text = payloadArgs.join(' ').trim();
    if (!text) fail('Usage: labflow memory append [--tag <tag>] <text>');
    const result = appendMemoryNote(workspaceRoot, text, tag);
    if (json) {
      printJson(result);
      return;
    }
    console.log(`Appended memory note to ${result.path}`);
    return;
  }

  fail(`Unknown memory subcommand: ${subcommand}`);
}

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];
const rest = args.slice(2);

if (!command || command === '--help' || command === 'help') {
  printHelp();
  process.exit(0);
}

if (!manifest.stableCommands.includes(command)) {
  fail(`Unknown or non-stable command: ${command}`);
}

if (command === 'doctor') {
  const { json } = parseCommonFlags(args.slice(1));
  printDoctor(json);
  process.exit(0);
}

if (command === 'init') {
  ensureStateDir(workspaceRoot);
  const { json } = parseCommonFlags(args.slice(1));
  printInit(json);
  process.exit(0);
}

if (command === 'status') {
  const { json } = parseCommonFlags(args.slice(1));
  printStatus(json);
  process.exit(0);
}

if (command === 'task') {
  runTask(subcommand, rest);
  process.exit(0);
}

if (command === 'session') {
  runSession(subcommand, rest);
  process.exit(0);
}

if (command === 'memory') {
  runMemory(subcommand, rest);
  process.exit(0);
}

fail(`Stable command not yet wired: ${command}`);
