import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baselinePractice="function updateSnapshot(list,exam,admin=false){const next=clone(list||[]),parent=exam.parentMockId||exam.id,i=next.findIndex(x=>x.id===parent);const removed=[];if(i<0&&!admin)while(next.length>=5)removed.push(next.shift());const j=next.findIndex(x=>x.id===parent),prior=j>=0?next[j]:null,attempts=clone(prior?.attempts|| (prior?.snapshot?[prior.snapshot]:[])),idx=attempts.findIndex(x=>x.id===exam.id);if(idx<0)attempts.push(clone(exam));else attempts[idx]=clone(exam);const item={id:parent,name:prior?.name||mockName(exam.startedAt||Date.now()),createdAt:prior?.createdAt||exam.startedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),snapshot:clone(exam),attempts};if(j<0)next.push(item);else next[j]=item;return {list:next,removed}}";
const candidatePractice=readFileSync(new URL('../public/phase2-practice-core.mjs',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('export function updateSnapshot')).replace('export ','');
const fixed='2026-11-24T10:00:00Z';
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return Date.parse(fixed)}}
function loadPractice(source){let clones=0;const clone=x=>{clones++;return JSON.parse(JSON.stringify(x))};const ctx=vm.createContext({clone,Date:FixedDate,mockName:()=> 'Mock'});vm.runInContext(source+';this.run=updateSnapshot',ctx);return {run:ctx.run,clones:()=>clones}}
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
