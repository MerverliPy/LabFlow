<div align="center">

# 🧪 LabFlow

**A file-first workflow monorepo for terminal tooling, lightweight project state, and Claude Code asset bootstrapping.**

[![CI](https://img.shields.io/github/actions/workflow/status/MerverliPy/LabFlow/ci.yml?branch=main&label=CI)](https://github.com/MerverliPy/LabFlow/actions/workflows/ci.yml)
[![Pages](https://img.shields.io/github/actions/workflow/status/MerverliPy/LabFlow/pages.yml?branch=main&label=Pages)](https://github.com/MerverliPy/LabFlow/actions/workflows/pages.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

**Small surface. Durable state. Proof before promotion.**

</div>

---

## Overview

**LabFlow** is a compact monorepo built around a simple operating model:

> Keep developer workflows **small, inspectable, durable, and low-bloat**.

This repository combines four related pieces:

- a **terminal-first CLI**
- a **file-based workspace state model**
- a **behavioral proof harness**
- a **Claude Code asset pack** for repeatable project bootstrapping

It is best understood as a **hybrid tooling repo** rather than a single-purpose package.

---

## What makes it different

Many workflow tools expand by adding more commands, more layers, and more hidden state.

LabFlow goes the other direction.

### Core priorities

- **Small command surface**
- **Local, readable state**
- **Phase-based execution**
- **Low default overhead**
- **Verification before promotion**
- **Files over opaque memory**

### Explicit non-goals

- giant command catalogs
- default MCP / hook / plugin sprawl
- oversized memory systems
- hidden automation state
- workflow complexity for its own sake

---

## What is in the repo

### Local CLI

A lightweight CLI for managing project-local state under `.labflow/`.

Stable commands:

- `init`
- `task`
- `session`
- `memory`
- `status`
- `doctor`

### Proof harness

A verification layer that exercises CLI behavior and state handling, including edge cases such as missing or corrupted state files.

### Claude Code asset pack

A reusable pack under [`claude-code-pack/`](./claude-code-pack/) with skills, agents, templates, and install scripts for a more bounded Claude Code workflow.

### Website

A small Vite app under [`apps/www/`](./apps/www/).

---

## Current status

> **Practical status:** the repo is usable locally, but it is still actively converging.

### Working now

- workspace initialization and repair
- task lifecycle commands
- session lifecycle commands
- memory note append and inspection
- workspace status and schema reporting
- environment and identity diagnostics
- CI and Pages workflows
- Claude Code asset-pack structure

### Important context

This repository currently mixes:

- tooling code
- repo operating files
- publishing documentation
- Claude Code reusable assets

That makes it useful as a working monorepo, but it should not be read as a fully normalized one-package public distribution yet.

---

## Quick start

Install dependencies:

```bash
pnpm install
```

Run the main checks:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
pnpm proof:verify
```

Use the CLI locally:

```bash
pnpm exec labflow init
pnpm exec labflow task add "Ship release hardening"
pnpm exec labflow session start "phase-1"
pnpm exec labflow memory append --tag release "Lock docs before publish"
pnpm exec labflow status --json
pnpm exec labflow doctor --json
```

Run the website locally:

```bash
pnpm dev:www
```

---

## CLI surface

| Command   | Purpose                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `init`    | Create or repair local `.labflow` state files                            |
| `task`    | Add, inspect, complete, reopen, and remove lightweight tasks             |
| `session` | Start, inspect, replace, close, and review session history               |
| `memory`  | Append tagged notes and inspect memory entries                           |
| `status`  | Report workspace state, schema health, and proof visibility              |
| `doctor`  | Print canonical identity, environment basics, and legacy-binary warnings |

---

## State model

LabFlow stores project state in a local directory:

```text
.labflow/
├── meta.json
├── tasks.json
├── session.json
└── memory.md
```

### Why this model matters

- easy to inspect manually
- easy to test
- easy to debug
- easy to repair
- easy for contributors to understand

This is one of the strongest design decisions in the repository.

---

## Repository layout

```text
LabFlow/
├── apps/
│   └── www/                        # small Vite website
├── claude-code-pack/               # reusable Claude Code asset pack
├── config/
│   └── stable-command-manifest.json
├── docs/
│   └── PUBLISHING.md
├── packages/
│   ├── cli/                        # CLI entrypoint
│   ├── core/                       # manifest + repo/runtime helpers
│   ├── memory/                     # workspace state storage
│   └── proof-sdk/                  # behavioral verification harness
├── .github/workflows/              # CI, Pages, Claude workflow
├── CLAUDE.md                       # lean repo instructions
├── STATE.md                        # current phase
├── PHASE_HANDOFF.md                # resumable next step
├── known-issues.md                 # active contradictions / constraints
└── decision-log.md                 # durable repo decisions
```

---

## Claude Code pack

The included asset pack is designed for users who want a **bounded Claude Code workflow** with less instruction sprawl.

### Pack goals

- reduce token waste
- keep memory bounded
- standardize a 4-skill flow
- keep agents narrow
- stay minimal by default

### Default skill flow

- `/phase-plan`
- `/phase-work`
- `/phase-verify`
- `/handoff`

See [`claude-code-pack/README.md`](./claude-code-pack/README.md) for details.

---

## Suggested reading order

For a fast repo walkthrough, read these in order:

1. [`config/stable-command-manifest.json`](./config/stable-command-manifest.json)
2. [`packages/cli/src/index.mjs`](./packages/cli/src/index.mjs)
3. [`packages/memory/src/store.mjs`](./packages/memory/src/store.mjs)
4. [`packages/proof-sdk/src/index.mjs`](./packages/proof-sdk/src/index.mjs)
5. [`claude-code-pack/README.md`](./claude-code-pack/README.md)

---

## Who this repo is for

LabFlow will be most interesting to people who care about:

- terminal-first tooling
- explicit state models
- low-complexity workflow systems
- proof-oriented developer tooling
- Claude Code repo discipline
- monorepos with a small conceptual core

---

## Philosophy

LabFlow favors:

- **truthful over flashy**
- **small over sprawling**
- **files over opaque memory**
- **proof over assumption**
- **phases over drift**

The value of the project is less about raw feature count and more about **shape, discipline, and bounded execution**.

---

## Notes for visitors

A few things are worth keeping in mind while evaluating the repo:

- it is active and still being refined
- some packaging and documentation paths are still converging
- the core ideas are stronger than the current polish level
- the repo is most compelling as a workflow model, not a feature-maximal platform

---
