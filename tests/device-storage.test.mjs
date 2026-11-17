import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/device-storage.js','utf8');
// Minimal asynchronous IndexedDB contract. Run the actual device adapter; inject
// transaction failures rather than replacing its backup/migration implementation.
function database(){
 const stores=new Map();let failPut=null;
 const db={createObjectStore(name){stores.set(name,new Map())},transaction(name){
  const map=stores.get(name),tx={error:null};let pending=0,failed=false;
  const request=action=>{const r={};pending++;queueMicrotask(()=>{try{r.result=action();r.onsuccess?.()}catch(e){failed=true;tx.error=r.error=e;r.onerror?.();tx.onerror?.()}finally{if(--pending===0&&!failed)queueMicrotask(()=>tx.oncomplete?.())}});return r};
  tx.objectStore=()=>({get:key=>request(()=>map.get(key)),getAllKeys:()=>request(()=>[...map.keys()]),getAll:()=>request(()=>[...map.values()]),
   put:(value,key)=>request(()=>{if(failPut?.(name,key,value))throw Error('Injected device write failure');map.set(key,value);return key}),delete:key=>request(()=>map.delete(key))});return tx;
 }};
 return {stores,setFailure(fn){failPut=fn},indexedDB:{open(){const r={result:db};queueMicrotask(()=>{if(!stores.size)r.onupgradeneeded?.();r.onsuccess?.()});return r}}};
}
async function device(database,initial={}){
 const raw=new Map(Object.entries(initial));class Storage{get length(){return raw.size}key(i){return [...raw.keys()][i]??null}getItem(k){return raw.get(k)??null}setItem(k,v){raw.set(String(k),String(v))}removeItem(k){raw.delete(k)}}
 const storage=new Storage(),events=[],ctx={Storage,localStorage:storage,indexedDB:database.indexedDB,location:{reload(){}},document:{querySelectorAll:()=>[]},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},dispatchEvent:e=>events.push(e)};
 ctx.window=ctx;await vm.runInNewContext(source,ctx);return {api:ctx.ReviewDevice,storage,raw,events};
}
const key='alfaisal-review-studio-v1',account='a'.repeat(64),snapshot=JSON.stringify({records:{r:{done:{0:'2026-11-01'},notes:'keep'}},settings:{theme:'light'}});
test('failed device migration stays retryable and preserves original progress',async()=>{
 const db=database();db.setFailure((store,k)=>store==='values'&&k.endsWith('|'+key));
 const initial={[key+'-account']:account,[key]:snapshot},failed=await device(db,initial);
 assert.equal(failed.api.available,false);assert.equal(db.stores.get('meta').get('initialized:'+account),undefined);assert.equal(failed.raw.get(key),snapshot);
 db.setFailure(null);const retried=await device(db,Object.fromEntries(failed.raw));
 assert.equal(retried.api.available,true);assert.equal(db.stores.get('meta').get('initialized:'+account),true);assert.equal(db.stores.get('values').get(account+'|'+key),snapshot);assert.equal(retried.storage.getItem(key),snapshot);
});
test('verified recovery copies stay in the device database and pruning waits for confirmation',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account,[key]:snapshot});
 await d.api.backup(account,snapshot);assert.equal(db.stores.get('recovery').get(account),snapshot);assert.equal(d.raw.get(key),snapshot);
 await d.api.confirmed();assert.equal(d.raw.has(key),false);assert.equal(d.storage.getItem(key),snapshot);assert.equal(db.stores.get('recovery').get(account),snapshot);
});
test('failed recovery writes are rejected while existing study data stays readable',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account,[key]:snapshot});db.setFailure(store=>store==='recovery');
 await assert.rejects(d.api.backup(account,snapshot),/Injected device write failure/);assert.equal(d.storage.getItem(key),snapshot);assert.equal(d.raw.get(key),snapshot);
});
test('source HTML uses the same durable bootstrap as the production optimizer',()=>{
 const html=fs.readFileSync('public/index.html','utf8'),inline=html.match(/<script id="deviceBootstrap">([\s\S]*?)<\/script>/);
 assert.ok(inline);assert.equal(inline[1].trim(),source.trim());
});
