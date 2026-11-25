import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/learning-ui.js',import.meta.url),'utf8');
const begin=source.indexOf('function replaceConceptFeedback('),end=source.indexOf("document.addEventListener('click',e=>{const link=",begin);
const patch=runInNewContext(source.slice(begin,end)+';replaceConceptFeedback');
test('checked feedback replaces only two elements instead of the entire study page',()=>{
 let replacements=[];
 const old={replaceWith(x){replacements.push(['batch',x])}},header={replaceWith(x){replacements.push(['header',x])}};
 const next={},nextHeader={};
 const root={querySelector(q){return q==='.concept-batch'?old:header},createElement(tag){assert.equal(tag,'template');return {content:{querySelector(q){return q==='.concept-batch'?next:nextHeader}}}}};
 assert.equal(patch('<section>grade-safe</section>',root),true);
 assert.deepEqual(replacements,[['header',nextHeader],['batch',next]]);
});
test('missing practice DOM gracefully falls back to full render and does not record twice',()=>{
 assert.equal(patch('anything',{querySelector:()=>null}),false);
 assert.match(source,/conceptBatch\.submitted=true;const patched=typeof practiceView==='function'&&replaceConceptFeedback/);
 assert.match(source,/if\(!patched\)render\(\)/);
 assert.match(source,/ExamTools\.recordSet\(conceptBatch\.questions,answers/);
});
