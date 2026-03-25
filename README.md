# LabFlow

GitHub-ready starter repo for **LabFlow** optimized for **Claude Code terminal** and now scaffolded to clone cleanly into **Cloudflare Workers**.

## Locked decisions
- Product / package / CLI / repo identity: **LabFlow / labflow / labflow / LabFlow**
- Canonical repo: `https://github.com/MerverliPy/LabFlow.git`
- Canonical homepage: `https://labflow-starter-template.calvinbrady8.workers.dev`
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
```

## Cloudflare quick start
```bash
pnpm install
pnpm worker:dev
```

Deploy:
```bash
pnpm worker:deploy
```

The Worker entrypoint lives at `src/index.ts` and the Wrangler config lives at `wrangler.jsonc`.

## Identity
- Product: **LabFlow**
- Package: **labflow**
- CLI: **labflow**
- Repo: **https://github.com/MerverliPy/LabFlow.git**
- Issues: **https://github.com/MerverliPy/LabFlow/issues**
- Owner: **LabFlowDevelopment**
