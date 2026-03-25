import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("config/stable-command-manifest.json", "utf8"));
const wrangler = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
const workerPath = wrangler.main;

const problems = [];
const LIVE_URL = "https://labflowdevelopment.calvinbrady8.workers.dev";
const REPO_URL = "https://github.com/MerverliPy/LabFlow.git";
const ISSUES_URL = "https://github.com/MerverliPy/LabFlow/issues";

if (wrangler.name !== "labflow") {
  problems.push(`wrangler.name must be labflow, got ${wrangler.name}`);
}

if (pkg.name !== "labflow") {
  problems.push(`package.json name must be labflow, got ${pkg.name}`);
}

if (manifest.identity.packageName !== "labflow") {
  problems.push("manifest packageName must be labflow");
}

if (!fs.existsSync(workerPath)) {
  problems.push(`Worker entry not found: ${workerPath}`);
}

if (pkg.repository?.url !== "git+https://github.com/MerverliPy/LabFlow.git") {
  problems.push("package repository.url mismatch");
}

if (pkg.homepage !== LIVE_URL) {
  problems.push("package homepage mismatch");
}

if (pkg.bugs?.url !== ISSUES_URL) {
  problems.push("package bugs.url mismatch");
}

if (manifest.identity.repoUrl !== REPO_URL) {
  problems.push("manifest repoUrl mismatch");
}

if (manifest.identity.homepageUrl !== LIVE_URL) {
  problems.push("manifest homepageUrl mismatch");
}

if (manifest.identity.issuesUrl !== ISSUES_URL) {
  problems.push("manifest issuesUrl mismatch");
}

if (problems.length) {
  console.error("Cloudflare validation failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log("Cloudflare validation passed.");
