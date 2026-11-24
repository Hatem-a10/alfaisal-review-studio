import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const source=read('device-storage.js');
const start=source.indexOf(' function drain(){');
const end=source.indexOf(' try{db=await open()',start);
assert.ok(start>=0&&end>start);
const writer=source.slice(start,end);
function harness(failures=0){
 const persisted=new Map(),transactions=[];
 const db={transaction(name,mode){
  assert.equal(name,'values');assert.equal(mode,'readwrite');
  const staged=new Map(),t={error:Error('Synthetic storage failure'),objectStore:()=>({put:(value,key)=>staged.set(key,value),delete:key=>staged.set(key,null)})};
  transactions.push(t);
  queueMicrotask(()=>{
   if(failures>0){failures--;t.onabort();return}
   for(const [key,value] of staged)value===null?persisted.delete(key):persisted.set(key,value);
   t.oncomplete();
  });
  return t;
 }};
 const ctx={db,pending:new Map(),id:key=>'student|'+key};
 const api=runInNewContext('let chain=Promise.resolve(),lastError;const notify=error=>{lastError=error};'+writer+'\n({queue,flushDevice})',ctx);
 return {...api,persisted,transactions,pending:ctx.pending};
}
test('flush retries a retained write after one transient failure without another edit',{timeout:5000},async()=>{
 const h=harness(1);
 h.queue('progress','new');
 await h.flushDevice();
 assert.equal(h.persisted.get('student|progress'),'new');
 assert.equal(h.pending.size,0);
 assert.equal(h.transactions.length,2);
});
test('persistent failure preserves pending data and refuses confirmation',{timeout:5000},async()=>{
 const h=harness(20);
 h.queue('progress','new');
 await assert.rejects(h.flushDevice(),/could not save/i);
 assert.equal(h.pending.get('student|progress'),'new');
 assert.equal(h.persisted.size,0);
 assert.equal(h.transactions.length,2);
});
test('queued newer value and deletion are preserved through a flush',{timeout:5000},async()=>{
 const h=harness();
 h.queue('progress','first');
 h.queue('progress','latest');
 h.queue('other','remove me');
 h.queue('other',null);
 await h.flushDevice();
 assert.equal(h.persisted.get('student|progress'),'latest');
 assert.equal(h.persisted.has('student|other'),false);
 assert.equal(h.pending.size,0);
});
test('hydration reads keys and values in the same read-only transaction',{timeout:5000},async()=>{
 const line=source.split('\n').find(s=>s.startsWith(' const readValues='));
 assert.ok(line);
 let transactions=0,calls=[];
 const db={transaction(name,mode){
  transactions++;assert.equal(name,'values');assert.equal(mode,'readonly');
  const t={objectStore:()=>({getAllKeys:r=>{calls.push(['keys',r]);return {result:['a','b']}},getAll:r=>{calls.push(['values',r]);return {result:[1,2]}}})};
  queueMicrotask(()=>t.oncomplete());return t;
 }};
 const fn=runInNewContext(line+'\nreadValues',{db});
 const result=await fn('range');
 assert.equal(transactions,1);
 assert.deepEqual(calls,[['keys','range'],['values','range']]);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),[['a','b'],[1,2]]);
});
test('unbundled and production bootstrap remain identical and have nonpersonal timing marks',()=>{
 const inline=read('index.html').match(/<script id="deviceBootstrap">([\s\S]*?)<\/script>/)?.[1];
 assert.equal(inline,source);
 for(const mark of ['studio-bootstrap-start','studio-account-verified','studio-device-hydrated','studio-scripts-loaded'])assert.ok(source.includes(mark));
});
