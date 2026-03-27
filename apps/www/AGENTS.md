# Website Package Rules

- Keep this app small, static, and easy to build.
- Prefer plain HTML, CSS, and small JS changes.
- Do not add framework complexity without a clear
  repo-level reason.
- Keep SEO, manifest, robots, and sitemap files
  consistent with visible site content.
- Treat this package as isolated from CLI logic.
- Verify website changes with:
  `pnpm --dir apps/www run build`
