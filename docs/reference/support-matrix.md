# Support Matrix Reference

The canonical support matrix is generated from `config/stable-command-manifest.json`.

See:
- `docs/generated/README.support-matrix.md`
- `docs/generated/README.stable-core.md`

## Interpretation rule
- **Stable** means the command name and surface are locked.
- Stable can still have different maturity levels; current command status is expressed as `implemented` or `implemented-minimal`.
- Workspace state is intentionally lightweight and file-based under `.labflow/`.
- `status --json` is the canonical machine-readable state view for current behavior.
