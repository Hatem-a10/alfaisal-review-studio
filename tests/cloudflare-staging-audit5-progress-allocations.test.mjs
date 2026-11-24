import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baselinePractice="function updateSnapshot(list,exam,admin=false){const next=clone(list||[]),parent=exam.parentMockId||exam.id,i=next.findIndex(x=>x.id===parent);const removed=[];if(i<0&&!admin)while(next.length>=5)removed.push(next.shift());const j=next.findIndex(x=>x.id===parent),prior=j>=0?next[j]:null,attempts=clone(prior?.attempts|| (prior?.snapshot?[prior.snapshot]:[])),idx=attempts.findIndex(x=>x.id===exam.id);if(idx<0)attempts.push(clone(exam));else attempts[idx]=clone(exam);const item={id:parent,name:prior?.name||mockName(exam.startedAt||Date.now()),createdAt:prior?.createdAt||exam.startedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),snapshot:clone(exam),attempts};if(j<0)next.push(item);else next[j]=item;return {list:next,removed}}",baselineDelta="'use strict';\nconst ProgressDelta=(()=>{\n const safe=k=>typeof k==='string'&&!['__proto__','constructor','prototype'].includes(k),obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);\n function checkValue(value){const stack=[[value,0]];while(stack.length){const [v,depth]=stack.pop();if(depth>64)throw Error('Progress value is too deeply nested');if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))continue;if(typeof v!=='object'||!v)throw Error('Invalid progress value');for(const k of Object.keys(v)){if(!safe(k))throw Error('Unsafe progress field');stack.push([v[k],depth+1])}}}\n function diff(before,after){before=before==null?{}:JSON.parse(JSON.stringify(before));after=JSON.parse(JSON.stringify(after));const ops=[];function walk(a,b,path){if(JSON.stringify(a)===JSON.stringify(b))return;if(obj(a)&&obj(b)&&path.length<16){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(!safe(k))throw Error('Unsafe progress field');if(!Object.hasOwn(b,k))ops.push({path:[...path,k],remove:true});else if(!Object.hasOwn(a,k)){checkValue(b[k]);ops.push({path:[...path,k],value:b[k]})}else walk(a[k],b[k],[...path,k])}}else{checkValue(b);ops.push({path,value:b})}}for(const k of ['records','settings','extras'])if(Object.hasOwn(after,k))walk(before?.[k],after[k],[k]);return ops}\n function apply(snapshot,ops){if(!Array.isArray(ops)||ops.length>8000)throw Error('Invalid patch size');const out=structuredClone(snapshot);for(const op of ops){if(!obj(op))throw Error('Invalid patch operation');const p=op.path;if(!Array.isArray(p)||p.length<1||p.length>16||!['records','settings','extras'].includes(p[0])||p.some(k=>typeof k!=='string'||k.length>240||!safe(k)))throw Error('Invalid patch path');if(Object.hasOwn(op,'remove')&&op.remove!==true||op.remove===true&&Object.hasOwn(op,'value'))throw Error('Conflicting patch operation');let x=out;for(const k of p.slice(0,-1)){if(!Object.hasOwn(x,k)||!obj(x[k]))throw Error('Missing patch parent');x=x[k]}const k=p.at(-1);if(op.remove===true){if(p.length===1)throw Error('Cannot remove snapshot root');delete x[k]}else{if(!Object.hasOwn(op,'value'))throw Error('Missing patch value');checkValue(op.value);x[k]=structuredClone(op.value)}}return out}\n return {diff,apply};\n})();\n";
const candidatePractice=readFileSync(new URL('../public/phase2-practice-core.mjs',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('export function updateSnapshot')).replace('export ','');
const candidateDelta=readFileSync(new URL('../public/progress-delta.js',import.meta.url),'utf8');
const fixed='2026-11-24T10:00:00Z';
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return Date.parse(fixed)}}
function loadPractice(source){let clones=0;const clone=x=>{clones++;return JSON.parse(JSON.stringify(x))};const ctx=vm.createContext({clone,Date:FixedDate,mockName:()=> 'Mock'});vm.runInContext(source+';this.run=updateSnapshot',ctx);return {run:ctx.run,clones:()=>clones}}
function loadDelta(source){let serializations=0;const ctx=vm.createContext({JSON:{parse:JSON.parse,stringify:v=>{serializations++;return JSON.stringify(v)}},structuredClone});vm.runInContext(source+';this.api=ProgressDelta',ctx);return {api:ctx.api,calls:()=>serializations}}
const normalize=x=>JSON.parse(JSON.stringify(x));
function median(fn){fn();const samples=[];for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
function exam(id,parent){return {id,parentMockId:parent,startedAt:fixed,questions:Array.from({length:80},(_,i)=>({id:'q'+i,question:'Question '+i,options:['a','b','c'],answer:i%3})),answers:{0:1}}}
test('A5-027 reuse cloned history attempts without sharing input or independent snapshots',()=>{
 const a=loadPractice(baselinePractice),b=loadPractice(candidatePractice),e=exam('a','parent');
 const histories=[[],[{id:'parent',snapshot:e}],[{id:'parent',snapshot:e,attempts:[e]}],Array.from({length:6},(_,i)=>({id:'m'+i,snapshot:exam('a'+i,'m'+i)}))];
 for(const history of histories)for(const admin of [true,false])for(const next of [e,exam('b','parent')]){
  const original=normalize(history),expected=normalize(a.run(history,next,admin)),actual=b.run(history,next,admin);
  assert.deepEqual(normalize(actual),expected);
  const parent=actual.list.find(m=>m.id==='parent');
  assert.notEqual(parent.snapshot,parent.attempts.find(x=>x.id===next.id));
  parent.snapshot.questions[0].question='changed';
  assert.notEqual(parent.attempts.find(x=>x.id===next.id).questions[0].question,'changed');
  assert.deepEqual(history,original);
 }
 const history=[{id:'parent',snapshot:e,attempts:Array.from({length:100},(_,i)=>exam('old'+i,'parent'))}];
 const first=loadPractice(baselinePractice),second=loadPractice(candidatePractice);assert.deepEqual(normalize(first.run(history,e,true)),normalize(second.run(history,e,true)));
 console.log(JSON.stringify({label:'A5-027 mock snapshot copy',baselineMedianMs:median(()=>first.run(history,e,true)),candidateMedianMs:median(()=>second.run(history,e,true)),baselineClonesPerCall:first.clones()/9,candidateClonesPerCall:second.clones()/9}));
});
test('A5-029 structural comparison preserves exact progress patches and rejection behavior',()=>{
 const a=loadDelta(baselineDelta),b=loadDelta(candidateDelta);
 const cases=[
  [{records:{a:{x:1,y:2}}},{records:{a:{y:2,x:1}}}],
  [{records:{a:{x:[null,1]}}},{records:{a:{x:[null,2]}}}],
  [{settings:{a:0,b:null}},{settings:{a:-0,b:undefined,c:false}}],
  [null,{extras:{a:{nested:['a','b']}}}],
  [{records:{a:'one'}},{records:{a:'two'}}],
  [{records:{a:1,b:2}},{records:{b:2}}],
  [{records:{}},JSON.parse('{"records":{"__proto__":{"polluted":true}}}')],
  [{records:{a:1}},JSON.parse('{"records":{"a":1,"constructor":1}}')]
 ];
 for(const [before,after] of cases){
  let expected,actual,oldError,newError;
  try{expected=normalize(a.api.diff(before,after))}catch(e){oldError=e.message}
  try{actual=normalize(b.api.diff(before,after))}catch(e){newError=e.message}
  assert.equal(newError,oldError);assert.deepEqual(actual,expected);
 }
});
test('A5-029 large unchanged progress subtree avoids repeated serialization',()=>{
 const before={records:Object.fromEntries(Array.from({length:1500},(_,i)=>['REN-'+i,{done:{0:fixed},learning:{read:['x','y'],attempts:Array.from({length:20},(_,j)=>({q:'q'+j,ok:j%2===0,at:fixed}))}}])),settings:{theme:'dark'},extras:{}};
 const after=structuredClone(before);after.records['REN-1499'].learning.attempts[19].ok=true;
 const a=loadDelta(baselineDelta),b=loadDelta(candidateDelta);
 const expected=normalize(a.api.diff(before,after)),actual=normalize(b.api.diff(before,after));assert.deepEqual(actual,expected);
 assert.deepEqual(normalize(b.api.apply(before,actual)),after);
 assert.ok(b.calls()<a.calls());const baselineCalls=a.calls(),candidateCalls=b.calls();
 console.log(JSON.stringify({label:'A5-029 progress delta',baselineMedianMs:median(()=>a.api.diff(before,after)),candidateMedianMs:median(()=>b.api.diff(before,after)),baselineStringifyCalls:baselineCalls,candidateStringifyCalls:candidateCalls}));
});
