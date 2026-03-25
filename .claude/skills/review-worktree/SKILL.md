---
name: review-worktree
description: Review changes in an isolated git worktree before merge.
---

# Review Worktree

## Purpose
Use a separate worktree to review risky or multi-file changes without mixing review and implementation in the same working tree.

## When to use
- pull request review
- risky refactors
- Cloudflare config changes
- package / manifest / workflow changes
- cross-file changes that need a clean pass/fail recommendation

## Workflow
1. Open or switch to a dedicated review worktree.
2. Inspect only the files relevant to the current phase or change.
3. Compare repo state against:
   - acceptance criteria
   - stable-core contract
   - current manifest and support matrix
4. Record:
   - what was checked
   - what passed
   - what failed
   - what remains unverified
5. Produce a clear recommendation:
   - merge
   - request changes
   - verify more

## Output format
- Scope reviewed
- Files inspected
- Checks run
- Findings
- Recommendation

## Rules
- do not edit by default
- prefer evidence over opinion
- keep findings specific
- call out drift between docs, config, and behavior
