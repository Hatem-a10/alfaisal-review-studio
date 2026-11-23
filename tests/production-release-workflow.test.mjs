import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/production-release.yml', import.meta.url), 'utf8');

test('production release workflow is manual, scoped and verified', () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s+(push|pull_request|schedule|workflow_run):/m);
  assert.match(workflow, /^  workflow_call:/m);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /(contents|actions|deployments): write/);
  assert.match(workflow, /concurrency:\n      group: production-release-job\n      cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /^concurrency:/m);
  assert.match(workflow, /verify-reviewed-release\.mjs --commit "\$SHA" --staging-ref origin\/cloudflare-staging/);
  assert.match(workflow, /build:production-candidate/);
  assert.match(workflow, /check-production-guard\.mjs/);
  assert.match(workflow, /prepare-production-config\.mjs "\$PRODUCTION_D1_ID" "\$SHA" --access "\$ACCESS_MODE"/);
  assert.match(workflow, /\^\(open\|restricted\)\$/);
  assert.match(workflow, /wrangler deploy --dry-run --config "\$CONFIG"/);
});

test('production release workflow never touches data, schema, secrets or routes', () => {
  assert.doesNotMatch(workflow, /d1 (execute|migrations)/);
  assert.doesNotMatch(workflow, /r2 (object|bucket)/);
  assert.doesNotMatch(workflow, /wrangler secret/);
  assert.doesNotMatch(workflow, /routes?:|custom_domain|wrangler triggers/);
  const deploys = workflow.split('\n').filter(line => /\bwrangler deploy\b/.test(line)).map(line => line.trim());
  assert.deepEqual(deploys, ['run: npx --no-install wrangler deploy --dry-run --config "$CONFIG"']);
});

test('production release keeps the live access mode explicit and rolls back on failed verification', () => {
  assert.match(workflow, /options: \[open, restricted\]/);
  assert.match(workflow, /default: open/);
  assert.match(workflow, /\[ "\$ACTIVE" = "\$VID" \]/);
  assert.match(workflow, /auth\/sign-in/);
  assert.match(workflow, /wrangler rollback "\$\{\{ steps\.previous\.outputs\.version \}\}"/);
  assert.match(workflow, /if: \$\{\{ failure\(\) && inputs\.deploy/);
});
