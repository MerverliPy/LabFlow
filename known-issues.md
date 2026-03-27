# Known Issues

## Active constraints
- This repo still contains product code and site assets alongside the Claude Code utility pack, so the repository is not yet a pure utility-only distribution.
- The current environment cannot run an interactive Claude Code session, so final validation is limited to structural and shell-based checks.
- Some legacy docs still describe LabFlow as a product implementation pack; treat `claude-code-pack/README.md` and the active truth files as the current direction.

## Current contradictions to watch
- Root `package.json` is for the site shell, not the CLI packages. Do not assume root scripts describe the monorepo command surface.
- Package metadata differs slightly across workspace packages. Normalize later if this repo is repackaged for public distribution.
