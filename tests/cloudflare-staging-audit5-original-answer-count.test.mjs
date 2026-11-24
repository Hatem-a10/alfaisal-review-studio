import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="document.addEventListener('change',e=>{const t=e.target;if(t.dataset.originalAnswer&&originalRun&&!originalRun.finishedAt){originalRun.answers[t.dataset.originalAnswer]=+t.value;saveOriginalRun();const count=document.querySelector('#originalAnswered');if(count)count.textContent=Object.keys(originalRun.answers).length+' / '+originalRun.ids.length+' responses saved on this device.'}});\ndocument.addEventListener('input',e=>{const t=e.target;if(t.dataset.originalWritten&&originalRun&&!originalRun.finishedAt){originalRun.answers[t.dataset.originalWritten]=t.value.slice(0,5000);saveOriginalRun()}});";
const source=readFileSync(new URL('../public/original-exams.js',import.meta.url),'utf8');
const helper=source.split('\n').filter(l=>l.startsWith('const originalCountCache=')||l.startsWith('function originalAnswerCount(')||l.startsWith('function originalTrackAnswer(')).join('\n');
const candidate=source.split('\n').filter(l=>l.startsWith("document.addEventListener('change',e=>")||l.startsWith("document.addEventListener('input',e=>")).join('\n');
function fixture(script,helpers,initial=2000){
 const handlers={},textNode={textContent:'seed'};
 const run={ids:Array.from({length:initial+30},(_,i)=>'q'+i),answers:Object.fromEntries(Array.from({length:initial},(_,i)=>['q'+i,i%4])),finishedAt:null};
 let saved=0;
 const context=vm.createContext({document:{addEventListener:(type,fn)=>{handlers[type]=fn},querySelector:()=>textNode},originalRun:run,saveOriginalRun:()=>saved++});
 vm.runInContext(helpers+'\n'+script+'\nthis.resync=typeof originalAnswerCount==="function"?()=>originalAnswerCount(originalRun,true):()=>Object.keys(originalRun.answers).length',context);
 return {change:(key,value)=>handlers.change({target:{dataset:{originalAnswer:key},value}}),write:(key,value)=>handlers.input({target:{dataset:{originalWritten:key},value}}),getRun:()=>context.originalRun,setRun:r=>context.originalRun=r,display:()=>textNode.textContent,saved:()=>saved,resync:context.resync};
}
function median(fn){fn();const samples=[];for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
test('A5-152 original exam counts preserve all change/input and retry semantics',()=>{
 const a=fixture(baseline,''),b=fixture(candidate,helper);
 const actions=[['change','q0','1'],['change','q2000','2'],['write','q2001','short answer'],['change','q2000','3'],['write','q2','edited'],['change','q2002','0']];
 for(const [type,id,val] of actions){
  a[type](id,val);b[type](id,val);
  assert.deepEqual(b.getRun().answers,a.getRun().answers);
  if(type==='change')assert.equal(b.display(),a.display());
 }
 assert.equal(b.saved(),a.saved());
 const run={ids:['q0','q1'],answers:{q0:1},finishedAt:null};
 a.setRun(structuredClone(run));b.setRun(structuredClone(run));a.resync();b.resync();
 for(const x of [a,b])x.change('q1','3');
 assert.equal(b.display(),a.display());
 assert.equal(b.getRun().answers.q1,3);
});
test('A5-152 avoids repeated full answer-object key enumeration',()=>{
 const base=fixture(baseline,''),optimized=fixture(candidate,helper);
 const invoke=x=>{for(let i=0;i<250;i++)x.change('q'+(i%100),String(i%4))};
 invoke(base);invoke(optimized);assert.deepEqual(optimized.getRun().answers,base.getRun().answers);
 console.log(JSON.stringify({label:'A5-152 original answer counts',baselineMedianMs:median(()=>invoke(base)),candidateMedianMs:median(()=>invoke(optimized)),initialAnswers:2000,changesPerSample:250}));
});

test('A5-152 external exam-mode writes are reflected when classic view remounts',()=>{
 const candidate=readFileSync(new URL('../public/original-exams.js',import.meta.url),'utf8');
 assert.match(candidate,/if\(visibleOriginalRun\(\)\)\{originalAnswerCount\(originalRun,true\)/);
 const sample=fixture(candidate.split('\n').filter(l=>l.startsWith("document.addEventListener('change',e=>")||l.startsWith("document.addEventListener('input',e=>")).join('\n'),candidate.split('\n').filter(l=>l.startsWith('const originalCountCache=')||l.startsWith('function originalAnswerCount(')||l.startsWith('function originalTrackAnswer(')).join('\n'));
 sample.change('q2000','1');const run=sample.getRun();run.answers.q2001=2;
 assert.equal(sample.resync(),2002);
 sample.change('q2002','3');assert.equal(sample.display(),'2003 / '+run.ids.length+' responses saved on this device.');
});
