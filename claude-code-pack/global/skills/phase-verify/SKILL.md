---
name: phase-verify
description: Verify the smallest changed scope first, then report pass fail evidence and unresolved risk.
---

# Phase Verify

1. Choose the narrowest relevant verification target.
2. Run small local checks before broad repo-wide checks.
3. Report:
   - verified scope
   - passes
   - failures
   - unresolved risk
4. Save reusable patterns to verifier memory, not root docs.
