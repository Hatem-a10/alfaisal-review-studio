import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/examplify-mode.js',import.meta.url),'utf8');
test('question scratchpad is bounded and uses existing per-question exam notes',()=>{
 const code=source.slice(source.indexOf('function scratchpadText('),source.indexOf('function scratchpadMarkup('));
 const extract=runInNewContext(code+';scratchpadText');
 assert.equal(extract({notes:{0:'first question',1:'second question'}},1),'second question');
 assert.equal(extract({notes:{0:'z'.repeat(13000)}},0).length,12000);
 assert.equal(extract({notes:{0:{malformed:true}}},0),'');
 assert.match(source,/maxlength="12000" aria-label="Private working notes for question/);
 assert.match(source,/esc\(scratchpadText\(d,d\.current\)\)/);
 assert.match(source,/d\.notes\[d\.current\]=t\.value\.slice\(0,12000\);save\(\)/);
});
test('vignette highlighting and notes shortcut retain answer-independent behavior',()=>{
 assert.match(source,/data-xp-action="scratch" aria-keyshortcuts="N"/);
 assert.match(source,/highlighted\(q\.caseText,'case'\)/);
 assert.match(source,/tool==='scratch'/);
 assert.match(source,/n:'scratch'/);
 assert.match(source,/not submitted as an answer and do not affect scoring/);
});
