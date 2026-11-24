import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

// Cloudflare Workers Builds and GitHub checks must run the same exact Node release,
// otherwise a test can pass on GitHub and still fail the staging build (see #113).
test('Node is pinned to one exact version for Cloudflare builds and GitHub checks',()=>{
 const pinned=readFileSync('.node-version','utf8').trim();
 assert.match(pinned,/^\d+\.\d+\.\d+$/,'.node-version must hold an exact version');
 for(const file of readdirSync('.github/workflows')){
  const text=readFileSync(`.github/workflows/${file}`,'utf8');
  if(!text.includes('actions/setup-node'))continue;
  assert.doesNotMatch(text,/node-version:\s/,`${file} must use node-version-file instead of a loose node-version`);
  assert.match(text,/node-version-file:\s*\.node-version/,`${file} must read .node-version`);
 }
});
