# LabFlow GitHub Implementation Pack

GitHub-ready starter repo for **LabFlow** optimized for a terminal-first workflow.

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
- canonical identity is defined in `config/stable-command-manifest.json`
- repo, homepage, and issues metadata are configured
- public install status must be confirmed with `pnpm release:readiness` and packed-install verification
- release blockers are tracked in `RELEASE_READINESS.md`

## What works now
- `labflow init` bootstraps or repairs workspace state files
- `labflow status [--json]` reports workspace state, schema version, and latest proof artifact
- `labflow task add|list|show|done|reopen|remove` manages lightweight tasks
- `labflow session start|show|history|close` manages the active session and closed-session history
- `labflow memory append|show` manages local memory notes with optional tags
- `labflow doctor [--json]` prints canonical identity, environment basics, and legacy-binary drift

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
