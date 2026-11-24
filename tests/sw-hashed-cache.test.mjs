import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sw = readFileSync(new URL('../public/review-sw.js', import.meta.url), 'utf8');

test('service worker serves content-hashed startup bundles from cache before the network', () => {
  const hashed = sw.indexOf("kind==='core'&&/^\\/_studio\\/[\\w.-]+-[0-9a-f]{16}\\.[a-z.]+$/.test(url.pathname)");
  const network = sw.search(/const response=kind==='private'\?await fetch\(request,\{cache:'no-store'\}\):await fetch\(request\)/);
  assert.ok(hashed > 0 && network > hashed, 'hashed bundle cache lookup must precede the network fetch');
  const pattern = /^\/_studio\/[\w.-]+-[0-9a-f]{16}\.[a-z.]+$/;
  assert.ok(pattern.test('/_studio/client-b965001597c49be3.js'));
  assert.ok(pattern.test('/_studio/search-index-a4a5ddfdc07a19e3.json.gz'));
  assert.ok(!pattern.test('/_studio/client.js'));
  assert.ok(!pattern.test('/index.html'));
});
