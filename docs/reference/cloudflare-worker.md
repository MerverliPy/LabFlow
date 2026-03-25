# Cloudflare Worker

LabFlow now includes a root-level Cloudflare Worker scaffold so the repository can be cloned directly into Cloudflare Workers.

## Files
- `wrangler.jsonc`
- `src/index.ts`

## Local commands
```bash
pnpm install
pnpm worker:dev
```

## Deploy
```bash
pnpm worker:deploy
```

## Notes
- The repository root is the Worker root.
- Cloudflare clone/import flows can use the repo as-is because `wrangler.jsonc` is present at the root.
- The Worker serves a simple HTML landing page at `/` and a JSON health endpoint at `/healthz`.
