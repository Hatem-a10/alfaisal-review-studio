import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/device-storage.js','utf8');
// Minimal asynchronous IndexedDB contract. Run the actual device adapter; inject
// transaction failures rather than replacing its backup/migration implementation.
function database(){
 const stores=new Map();let failPut=null;const counters={valueTransactions:0,valueWrites:0};
 const db={createObjectStore(name){stores.set(name,new Map())},transaction(name,mode){if(name==='values'&&mode==='readwrite')counters.valueTransactions++;
  const map=stores.get(name),tx={error:null};let pending=0,failed=false;
  const request=action=>{const r={};pending++;queueMicrotask(()=>{try{r.result=action();r.onsuccess?.()}catch(e){failed=true;tx.error=r.error=e;r.onerror?.();tx.onerror?.()}finally{if(--pending===0&&!failed)queueMicrotask(()=>tx.oncomplete?.())}});return r};
  tx.objectStore=()=>({get:key=>request(()=>map.get(key)),openCursor:()=>{const rows=[...map.entries()];const r={};let i=0;pending++;const step=()=>queueMicrotask(()=>{if(i<rows.length){const [key,value]=rows[i++];r.result={key,value,continue:step};r.onsuccess?.()}else{r.result=null;r.onsuccess?.();if(--pending===0&&!failed)queueMicrotask(()=>tx.oncomplete?.())}});step();return r;},
   put:(value,key)=>request(()=>{if(failPut?.(name,key,value))throw Error('Injected device write failure');if(name==='values')counters.valueWrites++;map.set(key,value);return key}),delete:key=>request(()=>map.delete(key))});return tx;
 }};
 return {stores,counters,setFailure(fn){failPut=fn},indexedDB:{open(){const r={result:db};queueMicrotask(()=>{if(!stores.size)r.onupgradeneeded?.();r.onsuccess?.()});return r}}};
}
async function device(database,initial={},overrides={}){
 const raw=new Map(Object.entries(initial));class Storage{get length(){return raw.size}key(i){return [...raw.keys()][i]??null}getItem(k){return raw.get(k)??null}setItem(k,v){raw.set(String(k),String(v))}removeItem(k){raw.delete(k)}}
 const storage=new Storage(),events=[],ctx={Storage,localStorage:storage,indexedDB:database.indexedDB,location:{reload(){}},document:{querySelectorAll:()=>[],getElementById:()=>null},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},dispatchEvent:e=>events.push(e)};
 Object.assign(ctx,overrides);ctx.window=ctx;await vm.runInNewContext(source,ctx);return {api:ctx.ReviewDevice,storage,raw,events};
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

test('fresh managed account binds before hydration and never inherits another device account',async()=>{
 const db=database();await device(db,{[key+'-account']:account,[key]:snapshot});const next='b'.repeat(64);
 const d=await device(db,{[key+'-account']:account,[key]:snapshot},{REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>({ok:true,json:async()=>({accountKey:next})})});
 assert.equal(d.storage.getItem(key+'-account'),next);assert.equal(d.storage.getItem(key),null);assert.equal(db.stores.get('values').get(account+'|'+key),snapshot);
});
test('logged-out managed account cannot hydrate cached progress offline',async()=>{
 const db=database(),redirects=[];const d=await device(db,{[key+'-account']:account,[key]:snapshot,'review-studio-managed-signed-out':'1'},{REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>{throw Error('offline')},location:{replace:url=>redirects.push(url)}});
 assert.equal(d.api,undefined);assert.equal(db.stores.size,0);assert.deepEqual(redirects,['/auth/sign-in']);assert.equal(d.raw.get(key),snapshot);
});

test('managed account fails closed if durable device isolation is unavailable',async()=>{
 const db=database();const d=await device(db,{[key+'-account']:account,[key]:snapshot},{REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>({ok:true,json:async()=>({accountKey:'b'.repeat(64)})}),indexedDB:{open(){throw Error('Unavailable')}}});
 assert.equal(d.api,undefined);assert.equal(d.raw.get(key),snapshot);assert.equal(d.raw.get(key+'-account'),account);
});

test('blocked IndexedDB startup fails safely and closes a late connection',async()=>{
 const db=database(),initial={[key+'-account']:account,[key]:snapshot};let request,closed=0;
 const d=await device(db,initial,{REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>({ok:true,json:async()=>({accountKey:account})}),indexedDB:{open(){request={result:{close(){closed++}}};queueMicrotask(()=>request.onblocked());return request}}});
 assert.equal(d.api,undefined);assert.equal(d.raw.get(key),snapshot);
 request.onsuccess();assert.equal(closed,1);
});
test('managed identity requires an actual account string',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account,[key]:snapshot},{REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>({ok:true,json:async()=>({accountKey:[account]})})});
 assert.equal(d.api,undefined);assert.equal(db.stores.size,0);assert.equal(d.raw.get(key),snapshot);
});
test('failed account switch preserves offline lock until verified hydration succeeds',async()=>{
 const db=database(),next='b'.repeat(64),initial={[key+'-account']:account,[key]:snapshot};
 await device(db,initial);
 db.setFailure((store,k)=>store==='meta'&&k==='initialized:'+next);
 const opts={REVIEW_STUDIO_FRESH_ACCOUNTS:true,fetch:async()=>({ok:true,json:async()=>({accountKey:next})})};
 const failed=await device(db,initial,opts);
 assert.equal(failed.api,undefined);assert.equal(failed.raw.get('review-studio-managed-signed-out'),'1');assert.equal(failed.raw.get(key+'-account'),account);
 db.setFailure(null);const recovered=await device(db,Object.fromEntries(failed.raw),opts);
 assert.equal(recovered.api.available,true);assert.equal(recovered.raw.has('review-studio-managed-signed-out'),false);assert.equal(recovered.storage.getItem(key+'-account'),next);
 assert.equal(recovered.storage.getItem(key),null);assert.equal(db.stores.get('values').get(account+'|'+key),snapshot);
});
test('confirmation does not prune a different or newer raw recovery copy',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account,[key]:snapshot});
 d.raw.set(key,'newer recovery');await d.api.confirmed();
 assert.equal(d.raw.get(key),'newer recovery');assert.equal(d.storage.getItem(key),snapshot);
 d.raw.set(key,snapshot);d.raw.set(key+'-account','b'.repeat(64));await d.api.confirmed();assert.equal(d.raw.get(key),snapshot);
});
test('managed account probe aborts stalled verification without opening storage',async()=>{
 const db=database();let timer,cleared=false,signal;
 class Controller{constructor(){this.signal={}}abort(){this.signal.abort()}}
 const d=await device(db,{[key+'-account']:account,[key]:snapshot},{REVIEW_STUDIO_FRESH_ACCOUNTS:true,AbortController:Controller,setTimeout(fn){timer=fn;return 1},clearTimeout(){cleared=true},fetch:async(url,options)=>new Promise((resolve,reject)=>{signal=options.signal;signal.abort=()=>reject(Error('aborted'));queueMicrotask(timer)})});
 assert.ok(signal);assert.equal(cleared,true);assert.equal(d.api,undefined);assert.equal(db.stores.size,0);assert.equal(d.raw.get(key),snapshot);
});

test('A5-063 identical managed values never enqueue redundant IndexedDB writes',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account}),name=key+'-audit5-identical';
 const value='{"mode":"study"}';
 d.storage.setItem(name,value);await d.api.flush();
 const before={...db.counters};
 for(let i=0;i<80;i++)d.storage.setItem(name,value);
 await d.api.flush();
 assert.equal(db.counters.valueWrites,before.valueWrites);
 assert.equal(db.counters.valueTransactions,before.valueTransactions);
 assert.equal(d.storage.getItem(name),value);
 assert.equal(db.stores.get('values').get(account+'|'+name),value);
 d.storage.setItem(name,'{"mode":"revised"}');await d.api.flush();
 assert.equal(db.counters.valueWrites,before.valueWrites+1);
 console.log(JSON.stringify({label:'A5-063 identical device values',repeatedWrites:80,extraDeviceWrites:0,changedWrites:1}));
});
test('A5-066 synchronous edit burst shares one committed IndexedDB transaction',async()=>{
 const db=database(),d=await device(db,{[key+'-account']:account}),prior={...db.counters};
 const prefix=key+'-audit5-burst-';
 for(let i=0;i<180;i++)d.storage.setItem(prefix+i,'value-'+i);
 await d.api.flush();
 assert.equal(db.counters.valueTransactions-prior.valueTransactions,1);
 assert.equal(db.counters.valueWrites-prior.valueWrites,180);
 for(let i=0;i<180;i++)assert.equal(db.stores.get('values').get(account+'|'+prefix+i),'value-'+i);
 console.log(JSON.stringify({label:'A5-066 pending device write burst',edits:180,transactions:1,persistedObjects:180}));
});
