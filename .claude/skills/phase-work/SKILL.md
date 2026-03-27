---
name: phase-work
description: Execute one scoped phase, keep the change set small, verify the smallest relevant scope, and update durable state.
disable-model-invocation: true
effort: medium
---

1. Read `CLAUDE.md`, `STATE.md`, and `PHASE_HANDOFF.md` first.
2. Restate the current phase in 5 lines or fewer.
3. Work only on the active phase.
4. Prefer the smallest correct edit set.
5. Run the smallest verification that can prove the change.
6. Update `STATE.md` with:
   - current status
   - blocker if any
   - next exact step
   - last verification result
7. Update `PHASE_HANDOFF.md` before stopping.
