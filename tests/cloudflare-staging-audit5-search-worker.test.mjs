import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildIndex,buildIndexOffMainThread,searchIndex} from '../public/phase1-search.mjs';
const data=()=>({
 lectures:Array.from({length:420},(_,i)=>({id:'REN-P'+i,title:'Renal anatomy '+i,context:'Kidney'})),
 objectives:Array.from({length:680},(_,i)=>({id:'obj-'+i,title:'Explain nephron mechanism '+i})),
 questions:Array.from({length:1150},(_,i)=>({id:'q'+i,title:'What causes tubular salt handling '+i,context:'REN physiology'})),
 materials:Array.from({length:250},(_,i)=>({id:'pdf-'+i,title:'Source lecture '+i,context:'PDF'}))
});
function factory({error=false,hold=false,throws=false}={}){
 let starts=0,terminates=0;
 const spawn=()=>{
  if(throws)throw Error('Worker creation blocked');
  starts++;
  return {onmessage:null,onerror:null,postMessage(message){
   if(error){queueMicrotask(()=>this.onerror?.(new Error('Worker unavailable')));return}
   if(!hold)queueMicrotask(()=>this.onmessage?.({data:{ok:true,index:buildIndex(message.source)}}));
  },terminate(){terminates++}};
 };
 return {spawn,counts:()=>({starts,terminates})};
}
test('A5-119 actual Worker-bound search output matches synchronous normalized/ranked source',async()=>{
 const source=data(),w=factory();
 const result=await buildIndexOffMainThread(source,{workerFactory:w.spawn});
 const baseline=buildIndex(source);
 assert.deepEqual(result,baseline);assert.deepEqual(w.counts(),{starts:1,terminates:1});
 for(const q of ['renal anatomy','tubular','nephron','source lecture'])assert.deepEqual(searchIndex(result,q),searchIndex(baseline,q));
 console.log(JSON.stringify({label:'A5-119 large ungraded search indexing',entries:baseline.length,mainThreadNormalizationRuns:0,dedicatedWorkerCreated:1,orderAndTitlesEquivalent:true}));
});
test('A5-119 abort terminates worker and does not publish incomplete index',async()=>{
 const w=factory({hold:true}),controller=new AbortController(),run=buildIndexOffMainThread(data(),{workerFactory:w.spawn,signal:controller.signal});
 controller.abort();
 assert.equal(await run,null);assert.deepEqual(w.counts(),{starts:1,terminates:1});
});
test('A5-119 a Worker CSP/import error falls back to cooperative source parity',async()=>{
 const source=data(),w=factory({error:true});
 const result=await buildIndexOffMainThread(source,{workerFactory:w.spawn,yieldControl:async()=>{}});
 assert.deepEqual(result,buildIndex(source));assert.deepEqual(w.counts(),{starts:1,terminates:1});
 const blocked=factory({throws:true}),another=await buildIndexOffMainThread(source,{workerFactory:blocked.spawn,yieldControl:async()=>{}});
 assert.deepEqual(another,buildIndex(source));assert.equal(blocked.counts().starts,0);
});
test('A5-119 small search scopes avoid worker startup and use the bounded main-thread path',async()=>{
 const w=factory({throws:true});
 const small={lectures:[{id:'one',title:'Renal'}]},result=await buildIndexOffMainThread(small,{workerFactory:w.spawn,yieldControl:async()=>{}});
 assert.deepEqual(result,buildIndex(small));assert.equal(w.counts().starts,0);
});
test('A5-119 worker code has no network/storage access and static offline manifest includes it',()=>{
 const source=readFileSync(new URL('../public/phase1-search-worker.mjs',import.meta.url),'utf8');
 assert.match(source,/import \{buildIndex\} from '\.\/phase1-search\.mjs'/);
 assert.match(source,/self\.postMessage\(\{ok:true,index:buildIndex\(source\)\}\)/);
 assert.doesNotMatch(source,/\bfetch\(|localStorage|indexedDB|\bimportScripts\(/);
 assert.ok(readFileSync(new URL('../scripts/offline-assets.mjs',import.meta.url),'utf8').includes("'/phase1-search-worker.mjs'"));
 // Run the real dedicated worker handler in a synthetic isolated context.
 let posted=null;const self={onmessage:null,postMessage:message=>{posted=message}};
 const runnable=source.replace("import {buildIndex} from './phase1-search.mjs';",'');
 vm.runInNewContext(runnable,{self,buildIndex,Error});
 self.onmessage({data:{source:{lectures:[{id:'a',title:'Renal'}]}}});
 assert.equal(posted.ok,true);assert.deepEqual(posted.index,buildIndex({lectures:[{id:'a',title:'Renal'}]}));
});
