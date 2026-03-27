# Claude Code Asset Pack

This pack turns LabFlow into a practical Claude Code utility repo.

## Design goals

- lower token waste
- keep memory durable and bounded
- standardize a four-skill workflow
- keep subagents narrow
- avoid default MCP, hook, and command bloat

## What is included

- `global/skills/` for reusable workflow skills that belong in `~/.claude/skills/`
- `global/agents/` for reusable narrow subagents that belong in `~/.claude/agents/`
- `project-template/` for thin repo-local operating files
- `install/` scripts for syncing global assets, bootstrapping a project, and auditing the pack

## Default install

1. Run `./claude-code-pack/install/sync-global.sh`
2. Run `./claude-code-pack/install/bootstrap-project.sh /path/to/target-repo`
3. In the target repo, inspect `CLAUDE.md`, `STATE.md`, and `PHASE_HANDOFF.md`
4. Start Claude Code and use `/phase-plan`, `/phase-work`, `/phase-verify`, and `/handoff`

## Current repo fit

This repository already uses the same four-skill surface and three-agent layout, so the pack is aligned with the current repo state rather than being a disconnected template.

## Deliberate omissions

- no default MCP servers
- no default hooks
- no plugin dependency
- no giant shared memory file
