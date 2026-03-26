import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function defaultMeta() {
  return {
    schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    productName: null,
    cliName: null,
    initializedAt: null,
    stableCommands: [],
    migratedAt: null,
    nextTaskId: 1
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

function validateMetaShape(value) {
  return (
    isPlainObject(value) &&
    (value.schemaVersion === undefined || typeof value.schemaVersion === 'number') &&
    (value.productName === undefined || value.productName === null || typeof value.productName === 'string') &&
    (value.cliName === undefined || value.cliName === null || typeof value.cliName === 'string') &&
    (value.initializedAt === undefined || value.initializedAt === null || typeof value.initializedAt === 'string') &&
    (value.migratedAt === undefined || value.migratedAt === null || typeof value.migratedAt === 'string') &&
    (value.nextTaskId === undefined || typeof value.nextTaskId === 'number') &&
    (value.stableCommands === undefined || Array.isArray(value.stableCommands))
  );
}

function validateTasksShape(value) {
  return isPlainObject(value) && Array.isArray(value.items);
}

function validateSessionShape(value) {
  return (
    isPlainObject(value) &&
    Array.isArray(value.history) &&
    (value.active === null || value.active === undefined || isPlainObject(value.active))
  );
}

function safeReadJson(filePath, fallback, code, issues, validate) {
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

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (validate && !validate(parsed)) {
      if (issues) {
        pushIssue(issues, {
          code: `invalid-${code}`,
          file: filePath,
          message: `State file has an invalid structure: ${path.basename(filePath)}`
        });
      }
      return structuredCloneFallback(fallback);
    }

    return parsed;
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
}

function deriveNextTaskIdFromTasks(taskData) {
  let maxId = 0;

  for (const item of taskData.items ?? []) {
    if (!item || typeof item.id !== 'string') continue;
    const match = item.id.match(/^task-(\d+)$/);
    if (!match) continue;
    maxId = Math.max(maxId, Number(match[1]));
  }

  return maxId + 1;
}

function normalizeMeta(meta, taskData) {
  const nextTaskId =
    typeof meta.nextTaskId === 'number' && Number.isFinite(meta.nextTaskId) && meta.nextTaskId > 0
      ? Math.floor(meta.nextTaskId)
      : deriveNextTaskIdFromTasks(taskData);

  return {
    ...defaultMeta(),
    ...meta,
    nextTaskId
  };
}

function ensureMemoryFile(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  ensureStateDir(workspaceRoot);
  if (!fs.existsSync(files.memory)) fs.writeFileSync(files.memory, defaultMemoryDocument());
  return files.memory;
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
      nextTaskId: 1
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

  const taskData = safeReadJson(files.tasks, defaultTasks(), 'tasks', null, validateTasksShape);
  const meta = normalizeMeta(
    safeReadJson(files.meta, defaultMeta(), 'meta', null, validateMetaShape),
    taskData
  );
  writeJson(files.meta, meta);

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
  if (!fs.existsSync(files.meta)) return { migrated: false, fromVersion: null, toVersion: SUPPORTED_STATE_SCHEMA_VERSION };

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(files.meta, 'utf8'));
  } catch {
    return { migrated: false, fromVersion: null, toVersion: SUPPORTED_STATE_SCHEMA_VERSION };
  }

  const taskData = safeReadJson(files.tasks, defaultTasks(), 'tasks', null, validateTasksShape);
  const fromVersion = typeof meta.schemaVersion === 'number' ? meta.schemaVersion : 0;
  const normalized = normalizeMeta(meta, taskData);

  if (fromVersion >= SUPPORTED_STATE_SCHEMA_VERSION && typeof meta.nextTaskId === 'number') {
    return { migrated: false, fromVersion, toVersion: SUPPORTED_STATE_SCHEMA_VERSION };
  }

  const next = {
    ...defaultMeta(),
    ...normalized,
    schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    migratedAt: isoNow()
  };
  writeJson(files.meta, next);
  return { migrated: true, fromVersion, toVersion: SUPPORTED_STATE_SCHEMA_VERSION };
}

export function inspectWorkspaceState(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  const stateDirExists = fs.existsSync(files.stateDir);
  const issues = [];

  if (!fs.existsSync(files.meta)) {
    if (stateDirExists && (fs.existsSync(files.tasks) || fs.existsSync(files.session) || fs.existsSync(files.memory))) {
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

  const meta = safeReadJson(files.meta, defaultMeta(), 'meta', issues, validateMetaShape);
  const schemaVersion = typeof meta.schemaVersion === 'number' ? meta.schemaVersion : null;
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

  safeReadJson(files.tasks, defaultTasks(), 'tasks', issues, validateTasksShape);
  safeReadJson(files.session, defaultSession(), 'session', issues, validateSessionShape);
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
  const files = workspaceFiles(workspaceRoot);
  const tasks = safeReadJson(files.tasks, defaultTasks(), 'tasks', null, validateTasksShape);
  const meta = safeReadJson(files.meta, defaultMeta(), 'meta', null, validateMetaShape);
  return normalizeMeta(meta, tasks);
}

export function readTasks(workspaceRoot) {
  return safeReadJson(
    workspaceFiles(workspaceRoot).tasks,
    defaultTasks(),
    'tasks',
    null,
    validateTasksShape
  );
}

export function findTask(workspaceRoot, taskId) {
  return readTasks(workspaceRoot).items.find((item) => item.id === taskId) || null;
}

export function addTask(workspaceRoot, title) {
  if (!title || !title.trim()) throw new Error('Task title is required.');
  const files = workspaceFiles(workspaceRoot);
  const data = readTasks(workspaceRoot);
  const meta = normalizeMeta(
    safeReadJson(files.meta, defaultMeta(), 'meta', null, validateMetaShape),
    data
  );

  const index = meta.nextTaskId;
  const task = {
    id: `task-${String(index).padStart(3, '0')}`,
    title: title.trim(),
    status: 'open',
    createdAt: isoNow()
  };
  data.items.push(task);
  meta.nextTaskId = index + 1;
  writeJson(files.tasks, data);
  writeJson(files.meta, meta);
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
  return safeReadJson(workspaceFiles(workspaceRoot).session, defaultSession(), 'session', null, validateSessionShape);
}

function createSessionId() {
  return `session-${Date.now()}-${randomUUID().slice(0, 8)}`;
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

export function closeSession(workspaceRoot) {
  const data = readSession(workspaceRoot);
  if (!data.active) return null;
  const closed = {
    ...data.active,
    endedAt: isoNow(),
    endedReason: 'closed'
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
  const note = formatMemoryNote(timestamp, text.trim(), tag ? tag.trim() : null);
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
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
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
