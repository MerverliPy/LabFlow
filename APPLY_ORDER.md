# Apply Order

```bash
git init
git branch -M main
pnpm install
pnpm validate:manifest
pnpm generate:docs
pnpm verify:generated-docs
pnpm build
pnpm test
pnpm proof:verify
pnpm check:shell
pnpm release:readiness
git add .
git commit -m "feat: harden proof, state contract, and release readiness"
# set repository metadata and lockfile before publish / remote setup
```
