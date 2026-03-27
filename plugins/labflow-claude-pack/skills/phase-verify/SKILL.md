---
name: phase-verify
description: Verify the current phase with the smallest relevant checks first, then report pass or fail with concrete evidence.
disable-model-invocation: true
effort: low
---

1. Prefer package-local or file-local checks before broader repo checks.
2. Run the minimum command set needed to prove or falsify the change.
3. Report:
   - command run
   - pass/fail
   - failing file or boundary
   - first actionable error
   - unresolved risk
4. Do not expand into broad cleanup unless verification proves it is necessary.
