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
    migratedAt: null
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

function safeReadJson(filePath, fallback, code, issues) {
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
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function ensureMemoryFile(workspaceRoot) {
  const files = workspaceFiles(workspaceRoot);
  ensureStateDir(workspaceRoot);
  if (!fs.existsSync(files.memory))
    fs.writeFileSync(files.memory, defaultMemoryDocument());
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
      migratedAt: null
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
  if (fromVersion >= SUPPORTED_STATE_SCHEMA_VERSION) {
    return {
      migrated: false,
      fromVersion,
      toVersion: SUPPORTED_STATE_SCHEMA_VERSION
    };
  }

  const next = {
    ...defaultMeta(),
    ...meta,
    schemaVersion: SUPPORTED_STATE_SCHEMA_VERSION,
    migratedAt: isoNow()
  };
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

  const meta = safeReadJson(files.meta, defaultMeta(), 'meta', issues);
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

  safeReadJson(files.tasks, defaultTasks(), 'tasks', issues);
  safeReadJson(files.session, defaultSession(), 'session', issues);
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
    'meta'
  );
}

export function readTasks(workspaceRoot) {
  return safeReadJson(
    workspaceFiles(workspaceRoot).tasks,
    defaultTasks(),
    'tasks'
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
  const index = data.items.length + 1;
  const task = {
    id: `task-${String(index).padStart(3, '0')}`,
    title: title.trim(),
    status: 'open',
    createdAt: isoNow()
  };
  data.items.push(task);
  writeJson(workspaceFiles(workspaceRoot).tasks, data);
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
    'session'
  );
}

function createSessionId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  return `session-${stamp}`;
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
