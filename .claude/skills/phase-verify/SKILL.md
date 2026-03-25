---
name: phase-verify
description: Verify one completed phase and record proof before closing it.
---

# Phase Verify

## Required checks
- file-level sanity
- manifest/docs consistency if affected
- command or package verification relevant to the phase
- update proof status in PHASE_HANDOFF.md

## Output format
1. Checks run
2. Results
3. Remaining risk
4. Pass/fail decision
5. Next step

## Rules
- verification must be evidence-based
- say exactly what was not verified
- fail clearly when acceptance criteria are not met
