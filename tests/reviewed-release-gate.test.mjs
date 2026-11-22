import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/reviewed-production-gate.yml', import.meta.url), 'utf8');
const verifier = readFileSync(new URL('../scripts/verify-reviewed-release.mjs', import.meta.url), 'utf8');

test('reviewed release gate is manual-only and read-only', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /push:\s*$/m);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /actions:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /actions:\s*write/);
  assert.match(workflow, /--commit/);
  assert.match(workflow, /origin\/cloudflare-staging/);
  assert.match(workflow, /production-candidate/);
  assert.match(workflow, /wrangler deploy --dry-run/);
  assert.doesNotMatch(workflow, /wrangler d1 execute/);
  assert.doesNotMatch(workflow, /wrangler r2 object put/);
  assert.doesNotMatch(workflow, /(?<!--dry-run)\bwrangler deploy\b(?! --dry-run)/);
});

test('release verifier requires exact checkout, staged ancestry and successful CI', () => {
  assert.match(verifier, /rev-parse', 'HEAD'/);
  assert.match(verifier, /merge-base', '--is-ancestor'/);
  assert.match(verifier, /head_sha/);
  assert.match(verifier, /conclusion === 'success'/);
  assert.match(verifier, /productionDeployment: false/);
  assert.match(verifier, /productionMigration: false/);
});
