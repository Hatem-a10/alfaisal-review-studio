#!/usr/bin/env node
// Start the "Production release" GitHub workflow for an approved commit and wait for the result.
// Usage: node scripts/release-production.mjs <full-sha> [--access open|restricted] [--upload-only]
// Needs an authenticated `gh` with access to the repository. Only the owner approves which SHA to release.
import {spawnSync} from 'node:child_process';

const repo = 'Hatem-a10/alfaisal-review-studio';
const args = process.argv.slice(2);
const sha = args[0];
const access = args.includes('--access') ? args[args.indexOf('--access') + 1] : 'open';
const deploy = !args.includes('--upload-only');
if (!/^[0-9a-f]{40}$/.test(sha || '') || !['open', 'restricted'].includes(access)) {
  console.error('Usage: node scripts/release-production.mjs <full-sha> [--access open|restricted] [--upload-only]');
  process.exit(2);
}

const gh = (...a) => {
  const r = spawnSync('gh', ['api', ...a], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(r.stderr.trim() || `gh api ${a.join(' ')} failed`);
  return r.stdout.trim();
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const runs = () => JSON.parse(gh(`repos/${repo}/actions/workflows/production-release.yml/runs?event=workflow_dispatch&per_page=5`)).workflow_runs;

const before = new Set(runs().map(r => r.id));
gh('-X', 'POST', `repos/${repo}/actions/workflows/production-release.yml/dispatches`, '-f', 'ref=main',
  '-f', `inputs[commit_sha]=${sha}`, '-f', `inputs[access_mode]=${access}`, '-F', `inputs[deploy]=${deploy}`);

let run;
for (let i = 0; i < 20 && !run; i++) { await sleep(3000); run = runs().find(r => !before.has(r.id)); }
if (!run) throw new Error('The workflow run did not appear.');
console.log(`Run ${run.id}: ${run.html_url}`);

while (run.status !== 'completed') { await sleep(15000); run = JSON.parse(gh(`repos/${repo}/actions/runs/${run.id}`)); }

const jobs = JSON.parse(gh(`repos/${repo}/actions/runs/${run.id}/jobs`)).jobs;
const failed = jobs.flatMap(j => j.steps.filter(s => s.conclusion === 'failure').map(s => `${j.name}: ${s.name}`));
console.log(`Result: ${run.conclusion}${failed.length ? `\nFailed: ${failed.join('; ')}` : ''}`);
if (run.conclusion === 'success' && deploy) {
  console.log(`Next: confirm sourceCommit ${sha.slice(0, 7)} at https://alfaisal.review/site-build-info.json from a signed-in browser.`);
}
process.exit(run.conclusion === 'success' ? 0 : 1);
