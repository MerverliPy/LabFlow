# State Contract

The LabFlow workspace state is intentionally file-based and local to the current working directory.

## State root
- Directory: `.labflow/`

## State files
- `meta.json`
- `tasks.json`
- `session.json`
- `memory.md`

## Schema version
- Current supported schema version: `1`
- Source of truth for support: `packages/memory/src/store.mjs`

## `meta.json`
```json
{
  "schemaVersion": 1,
  "productName": "LabFlow",
  "cliName": "labflow",
  "initializedAt": "ISO-8601",
  "stableCommands": ["init", "task", "session", "memory", "status", "doctor"],
  "migratedAt": null
}
```

## `tasks.json`
```json
{
  "items": [
    {
      "id": "task-001",
      "title": "Example task",
      "status": "open",
      "createdAt": "ISO-8601",
      "completedAt": "ISO-8601",
      "reopenedAt": "ISO-8601",
      "removedAt": "ISO-8601"
    }
  ]
}
```

Fields like `completedAt`, `reopenedAt`, and `removedAt` are present only when those transitions occur.

## `session.json`
```json
{
  "active": {
    "id": "session-YYYYMMDDHHMMSS",
    "label": "phase-name",
    "startedAt": "ISO-8601"
  },
  "history": [
    {
      "id": "session-YYYYMMDDHHMMSS",
      "label": "phase-name",
      "startedAt": "ISO-8601",
      "endedAt": "ISO-8601",
      "endedReason": "closed"
    }
  ]
}
```

## `memory.md`
The memory file is append-only text. Each note line follows this pattern:

```text
- 2026-03-25T20:41:56.969Z [tag:release] :: Lock docs before publish
```

The tag section is optional.

## Initialization and repair
- `labflow init` creates any missing state files.
- Re-running `labflow init` is idempotent.
- Missing files are repaired by creation.
- Corrupted JSON files are **not** auto-overwritten by normal commands.

## Corruption handling
- `labflow status --json` reports `stateIssues`.
- Commands that depend on corrupted or missing required JSON state exit with code `2`.
- The recommended repair path for missing files is `labflow init`.
- The recommended repair path for corrupted files is to inspect `labflow status --json`, restore from backup, or manually repair the file.

## Migration rule
- Older schema metadata can be upgraded by `labflow init`.
- Future schema changes must increment `schemaVersion`.
- Any schema newer than the supported version must be reported as `unsupported-schema-version` and blocked from mutation commands.

## Durability rule
The repo prefers **durable files over chat memory**. `.labflow/` is the canonical workspace-local state layer.
