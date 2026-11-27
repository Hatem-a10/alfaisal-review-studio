import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
// Regression: repaired questions with original options crashed mock results (`j is not defined`).
test('original options list escapes each original option, not the current option texts',()=>{
 const s=readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8');
 assert.ok(s.includes("q.originalOptions.map(o=>`<li>${esc(o)}</li>`)"));
 assert.ok(!/originalOptions\.map\(o=>[^)]*\[j\]/.test(s));
});
