# Apply Order

```bash
git init
git branch -M main
grep -R "<YOUR_" -n .
pnpm install
node tools/validate-manifest.mjs
node tools/generate-docs.mjs
bash scripts/check-shell.sh
git add .
git commit -m "chore: initialize LabFlow Claude Code baseline"
git remote add origin https://github.com/MerverliPy/LabFlow.git
git push -u origin main
```


## Cloudflare layer
1. Commit `wrangler.jsonc`.
2. Commit `src/index.ts`.
3. Run `node tools/validate-cloudflare.mjs`.
4. In Cloudflare Workers, clone the repo from the root.
