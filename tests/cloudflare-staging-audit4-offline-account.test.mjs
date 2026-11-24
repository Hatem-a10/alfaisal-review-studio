import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as policy from '../public/phase3-cache-policy.mjs';
import {createAccountBinder} from '../public/phase3-offline.mjs';
import {stampOfflineAccount,OFFLINE_ACCOUNT_HEADER} from '../lib/offline-account.mjs';
const a='a'.repeat(64),b='b'.repeat(64),origin='https://studio.example',asset=origin+'/api/site-assets/test',figure=origin+'/api/mock-figure/test?figure=8';
const code=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8').split('\n').slice(1).join('\n');
const tagged=(key,body='asset')=>new Response(body,{headers:{[OFFLINE_ACCOUNT_HEADER]:key}});
function harness(network,putHook=async()=>{}){
 const listeners={},data=new Map(),key=r=>typeof r==='string'?r:r.url;
 function cache(name){
  if(!data.has(name))data.set(name,new Map());const entries=data.get(name);
  return {async put(request,response){await putHook();entries.set(key(request),response)},async match(request){return entries.get(key(request))?.clone()},async keys(){return [...entries.keys()]},async delete(request){return entries.delete(key(request))}};
 }
 const caches={async open(name){return cache(name)},async keys(){return [...data.keys()]},async delete(name){return data.delete(name)},async match(request,{cacheName}){return data.get(cacheName)?.get(key(request))?.clone()}};
 runInNewContext(code,{...policy,self:{location:{origin},addEventListener(type,fn){listeners[type]=fn}},caches,fetch:network,Response,URL,Map,Set});
 const bind=(account,id='client')=>listeners.message({source:{id},data:{type:'ACCOUNT',key:account},ports:[]});
 function request(url=asset,id='client'){let result;listeners.fetch({request:new Request(url),clientId:id,respondWith(p){result=p}});return result}
 async function clear(id='client'){let task,reply;listeners.message({source:{id},data:{type:'CLEAR_OFFLINE'},ports:[{postMessage(m){reply=m}}],waitUntil(p){task=p}});await task;return reply}
 function seed(url,response,account=a){const name=policy.privateCacheName(account);if(!data.has(name))data.set(name,new Map());data.get(name).set(url,response)}
 return {bind,request,clear,data,seed};
}
test('response stamping uses the authenticated request identity and disables implicit HTTP caching',async()=>{
 const id='synthetic-account',req=new Request(asset,{headers:{'oai-authenticated-user-id':id}}),response=await stampOfflineAccount(new Response('asset',{headers:{'Content-Type':'text/plain'}}),req);
 const expected=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id))).toString('hex');
 assert.equal(response.headers.get(OFFLINE_ACCOUNT_HEADER),expected);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(await response.text(),'asset');
 assert.equal((await stampOfflineAccount(new Response('x'),new Request(asset))).headers.has(OFFLINE_ACCOUNT_HEADER),false);
 assert.equal((await stampOfflineAccount(new Response('x'),new Request(origin+'/api/progress',{headers:{'oai-authenticated-user-id':id}}))).headers.has(OFFLINE_ACCOUNT_HEADER),false);
});
test('account switch revokes the previous offline identity before the new check completes',async()=>{
 let local=a,resolve;const messages=[],worker={postMessage:m=>messages.push(m)};
 const bind=createAccountBinder({getWorker:()=>worker,readKey:()=>local,isOnline:()=>true,verify:()=>local===a?Promise.resolve(a):new Promise(r=>resolve=r)});
 await bind();local=b;const waiting=bind();assert.deepEqual(messages,[{type:'ACCOUNT',key:a},{type:'ACCOUNT',key:null}]);resolve(b);await waiting;assert.equal(messages.at(-1).key,b);
});
test('a different account on the asset response is rejected rather than cached or displayed',async()=>{
 let key=a,options;
 const h=harness(async (request,opts)=>typeof request==='string'?Response.json({accountKey:a}):(options=opts,tagged(key)));
 h.bind(a);assert.equal((await h.request()).status,200);assert.equal(options.cache,'no-store');
 assert.equal(h.data.get(policy.privateCacheName(a)).size,1);
 key=b;assert.equal((await h.request(figure)).status,409);assert.equal(h.data.get(policy.privateCacheName(a)).has(figure),false);
});
test('identity mismatch or malformed identity replies never fall back to old private data',async()=>{
 let mode='mismatch',assets=0;
 const h=harness(async request=>{if(typeof request==='string')return mode==='mismatch'?Response.json({accountKey:b}):new Response('bad-json');assets++;return tagged(a)});
 h.seed(asset,tagged(a,'old'));h.bind(a);assert.equal((await h.request()).status,409);assert.equal(assets,0);
 mode='malformed';h.bind(a);assert.equal((await h.request()).status,503);assert.equal(assets,0);
});
test('offline fallback rejects another account tag and unverified legacy user-specific figures',async()=>{
 const h=harness(async()=>{throw Error('offline')});h.bind(a);
 h.seed(figure,new Response('old figure'));assert.equal((await h.request(figure)).status,503);
 h.seed(figure,tagged(b));assert.equal((await h.request(figure)).status,503);
 h.seed(figure,tagged(a,'correct'));assert.equal(await (await h.request(figure)).text(),'correct');
 h.seed(asset,new Response('legacy shared'));assert.equal(await (await h.request()).text(),'legacy shared');
});
test('clearing waits for an in-flight cache write and does not report success without a bound account',async()=>{
 let release,started;const pendingPut=new Promise(r=>release=r),putStarted=new Promise(r=>started=r);
 const h=harness(async request=>typeof request==='string'?Response.json({accountKey:a}):tagged(a),async()=>{started();await pendingPut});
 assert.equal((await h.clear()).cleared,false);
 h.bind(a);const pending=h.request();await putStarted;let done=false;const clear=h.clear().then(r=>{done=true;return r});
 await new Promise(r=>setImmediate(r));assert.equal(done,false);release();await pending;assert.equal((await clear).cleared,true);assert.equal(h.data.has(policy.privateCacheName(a)),false);
});
test('network started before clear cannot repopulate the account cache afterward',async()=>{
 let release,started;const download=new Promise(r=>release=r),downloading=new Promise(r=>started=r);
 const h=harness(async request=>{if(typeof request==='string')return Response.json({accountKey:a});started();return download});
 h.bind(a);const pending=h.request();await downloading;assert.equal((await h.clear()).cleared,true);release(tagged(a));assert.equal((await pending).status,200);assert.equal(h.data.has(policy.privateCacheName(a)),false);
});
