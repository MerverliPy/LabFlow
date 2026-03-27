# LabFlow GitHub Implementation Pack

> Current direction: this repo now also contains a reusable Claude Code asset pack under `claude-code-pack/` for global skills, project bootstrapping, and pack auditing.

GitHub-ready starter repo for **LabFlow** optimized for **Claude Code terminal**.

## Locked decisions

- Product / package / CLI / repo identity: **LabFlow / labflow / labflow**
- Stable core only: `init`, `task`, `session`, `memory`, `status`, `doctor`
- Skills-first Claude Code surface
- Thin root `CLAUDE.md`
- Proof harness is a behavioral gate
- Three hardened subagents only
- Zero required plugins or MCP servers in the default path

## Current truth

- all 6 stable commands have real local behavior
- workspace state is stored in `.labflow/`
- `status --json` reports schema health and proof visibility
- public npm / `npx` install is **not** supported yet
- repo, homepage, and issues metadata are now configured
- release blockers are tracked in `RELEASE_READINESS.md`

## What works now

- `labflow init` bootstraps or repairs workspace state files
- `labflow status [--json]` reports workspace state, schema version, and latest proof artifact
- `labflow task add|list|show|done|reopen|remove` manages lightweight tasks
- `labflow session start|show|history|close` manages the active session and closed-session history
- `labflow memory append|show` manages local memory notes with optional tags
- `labflow doctor [--json]` prints canonical identity, environment basics, and legacy-binary drift

## Before publish

- generate `pnpm-lock.yaml` in a networked environment
- decide package visibility and release process
- verify installed execution after publish prep is complete

## First commands

```bash
pnpm install
pnpm validate:manifest
pnpm generate:docs
pnpm verify:generated-docs
pnpm build
pnpm test
pnpm proof:verify
pnpm check:shell
pnpm release:readiness
```

## Local CLI usage

```bash
pnpm exec labflow --help
pnpm exec labflow init
pnpm exec labflow task add "Ship release hardening"
pnpm exec labflow status --json
```
