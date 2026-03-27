---
name: phase-verify
description: Verify the smallest changed scope first, then report pass fail evidence and unresolved risk.
---

# Phase Verify

1. Identify the narrowest relevant verification target.
2. Run local package or file-scoped checks before broad repo-wide checks.
3. Record:
   - what was verified
   - what passed
   - what failed
   - unresolved risk
4. If a broader check is skipped, state why.
5. Feed reusable verification lessons to the verifier agent memory, not to root docs.
