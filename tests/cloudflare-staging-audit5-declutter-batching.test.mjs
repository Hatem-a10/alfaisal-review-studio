import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/phase1-copy.mjs',import.meta.url),'utf8');
const oldHead="  // A5-035: collect both independent DOM queries before mutating either list.\n  const welcome = container.querySelectorAll('.student-welcome [data-step] > p');\n  const intro = container.querySelectorAll('.intro > div > p');\n  for (const paragraph of welcome) {";
const oldLoop="  for (const paragraph of intro) {";
assert.ok(code.includes(oldHead)&&code.includes(oldLoop));
const prior=code.replace(oldHead,"  for (const paragraph of container.querySelectorAll('.student-welcome [data-step] > p')) {").replace(oldLoop,"  for (const paragraph of container.querySelectorAll('.intro > div > p')) {");
const asModule=async text=>import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
const [before,after]=await Promise.all([asModule(prior),asModule(code)]);
function fixture(){
 const traces=[],paragraphs=[
  {kind:'welcome',step:'0',text:'Set up your study space in a few steps.'},
  {kind:'welcome',step:'2',text:'Choose your accent and appearance.'},
  {kind:'intro',text:'Explain the mechanism, answer without hints, then use each mistake to choose the next question.'},
  {kind:'intro',text:'Visible instructional detail.'},
 ];
 const nodes=paragraphs.map(p=>({...p,deleted:false,textContent:p.text,parentElement:{getAttribute:()=>p.step},remove(){this.deleted=true;traces.push('remove:'+p.kind)}}));
 const container={querySelectorAll(selector){
  traces.push('query:'+selector);
  return nodes.filter(x=>!x.deleted&&(selector.includes('student-welcome')?x.kind==='welcome':x.kind==='intro'));
 }};
 return {container,traces,nodes};
}
test('A5-035 original and batched declutter remove exactly the same redundant paragraphs',()=>{
 const a=fixture(),b=fixture();
 assert.equal(before.declutter(a.container),3);
 assert.equal(after.declutter(b.container),3);
 assert.deepEqual(b.nodes.map(n=>n.deleted),a.nodes.map(n=>n.deleted));
 assert.equal(before.declutter(a.container),0);assert.equal(after.declutter(b.container),0);
 assert.deepEqual(b.nodes.map(n=>n.deleted),[true,true,true,false]);
});
test('A5-035 all DOM selection reads precede paragraph deletion writes',()=>{
 const a=fixture(),b=fixture();before.declutter(a.container);after.declutter(b.container);
 assert.equal(a.traces[0].startsWith('query:'),true);
 assert.equal(a.traces[1].startsWith('remove:'),true);
 assert.equal(b.traces[0].startsWith('query:'),true);
 assert.equal(b.traces[1].startsWith('query:'),true);
 assert.ok(b.traces.slice(2).every(x=>x.startsWith('remove:')));
 console.log(JSON.stringify({label:'A5-035 declutter batched DOM reads',queries:2,mutations:3,readWritePhasesBefore:3,after:2}));
});
test('A5-035 no broad selectors or removed visible copy introduced',()=>{
 assert.match(code,/\.student-welcome \[data-step\] > p/);
 assert.match(code,/\.intro > div > p/);
 assert.doesNotMatch(code,/removeChild|innerHTML\s*=/);
});
