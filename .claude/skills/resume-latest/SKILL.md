---
name: resume-latest
description: Resume the latest LabFlow phase for this repo using the saved handoff and state files.
---

# Resume Latest

## Read in order
1. `STATE.md`
2. `PHASE_HANDOFF.md`
3. most recently touched files from the handoff

## Output format
- current objective
- current blockers
- next exact command or edit
- files to open first

## Rules
- prefer repo-local latest context
- do not resume unrelated stale work
