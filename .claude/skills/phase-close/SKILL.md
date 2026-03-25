---
name: phase-close
description: Close a finished phase, snapshot the state, and prepare for a clean next session.
---

# Phase Close

## Steps
1. Confirm verification status.
2. Update `STATE.md`.
3. Update `PHASE_HANDOFF.md`.
4. Recommend `/compact` if context is large.
5. Recommend `/clear` before unrelated work.

## Completion rule
A phase is closed only when:
- verification is done
- handoff is written
- there is a commit or checkpoint
