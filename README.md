# LabFlow

GitHub-ready starter repo for **LabFlow** optimized for **Claude Code terminal** and scaffolded to clone cleanly into **Cloudflare Workers**.

## Locked decisions
- Product / package / CLI / repo identity: **LabFlow / labflow / labflow / LabFlow**
- Canonical repo: `https://github.com/MerverliPy/LabFlow.git`
- Canonical homepage: `https://labflowdevelopment.calvinbrady8.workers.dev`
- Stable core only: `init`, `task`, `session`, `memory`, `status`, `doctor`
- Skills-first Claude Code surface
- Thin root `CLAUDE.md`
- Proof harness scaffold
- Three hardened subagents only
- Zero required plugins or MCP servers in the default path
- Root `wrangler.jsonc` + Worker entrypoint for Cloudflare clone/import flows

## First commands
```bash
pnpm install
node tools/validate-manifest.mjs
node tools/validate-cloudflare.mjs
node tools/generate-docs.mjs
bash scripts/check-shell.sh
