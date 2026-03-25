---
name: verify-worktree
description: Run verification in an isolated worktree and report pass/fail with evidence.
---

# Verify Worktree

## Purpose
Use a separate worktree to run clean verification without polluting the main checkout.

## When to use
- before merge
- after a risky fix
- after manifest or workflow changes
- after Cloudflare Worker config changes
- when you need a clean pass/fail report

## Required checks
1. Structural integrity
   - required files exist
   - manifest and repo files agree
   - workflow/config filenames are correct
2. Behavioral proof
   - run the smallest relevant proof or smoke check
   - state exactly what was and was not verified

## Output format
- Verification scope
- Commands run
- Passes
- Failures
- Remaining risks
- Recommendation

## Rules
- do not edit by default
- verify the smallest meaningful scope first
- prefer reproducible commands
- fail clearly when acceptance criteria are not met
