import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as policy from '../public/phase3-cache-policy.mjs';
const code=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8').split('\n').slice(1).join('\n');
const origin='https://staging.example';
function harness(network){
 const listeners={},buckets=new Map(),counts={fetch:0,put:0};
 const key=r=>typeof r==='string'?r:r.url;
 const caches={async open(name){if(!buckets.has(name))buckets.set(name,new Map());const store=buckets.get(name);return{async put(r,response){counts.put++;store.set(key(r),response.clone())},async match(r){return store.get(key(r))?.clone()},async keys(){return [...store.keys()]},async delete(r){return store.delete(key(r))}}},
 async keys(){return [...buckets.keys()]},async delete(name){return buckets.delete(name)},async match(r,{cacheName}){return buckets.get(cacheName)?.get(key(r))?.clone()}};
 vm.runInNewContext(code,{...policy,self:{location:{origin},addEventListener(name,fn){listeners[name]=fn}},caches,Response,Request,URL,Map,Set,fetch:async request=>{counts.fetch++;return network(request)}});
 const request=(pathname,headers={})=>{let response;listeners.fetch({request:new Request(origin+pathname,{headers}),clientId:'student',respondWith(p){response=p}});if(!response)throw Error('Unhandled request');return response};
 return {request,counts,buckets};
}
const delay=()=>new Promise(resolve=>setImmediate(resolve));
test('A5-203 concurrent hashed public assets share one network request and cache write',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),h=harness(async()=>new Response(await pending,{headers:{'Content-Type':'text/javascript'}}));
 const url='/_studio/lesson-0123456789abcdef.js';
 const first=h.request(url),second=h.request(url);
 await delay();assert.equal(h.counts.fetch,1);
 release('export const version=1');
 const [a,b]=await Promise.all([first,second]);assert.equal(await a.text(),await b.text());
 assert.equal(h.counts.fetch,1);assert.equal(h.counts.put,1);
 const third=await h.request(url);assert.equal(await third.text(),'export const version=1');assert.equal(h.counts.fetch,1);
 console.log(JSON.stringify({label:'A5-203 static request singleflight',concurrentRequests:2,networkRequests:1,cacheWrites:1}));
});
test('A5-203 different paths, nonhashed assets, and conditional requests remain independent',async()=>{
 const h=harness(async()=>new Response('asset'));
 await Promise.all([h.request('/_studio/a-0123456789abcdef.js'),h.request('/_studio/b-0123456789abcdef.js')]);
 assert.equal(h.counts.fetch,2);
 await Promise.all([h.request('/phase1-search.mjs'),h.request('/phase1-search.mjs')]);
 assert.equal(h.counts.fetch,4);
 await Promise.all([h.request('/_studio/c-0123456789abcdef.js',{'If-None-Match':'"any"'}),h.request('/_studio/c-0123456789abcdef.js',{'If-None-Match':'"other"'})]);
 assert.equal(h.counts.fetch,6);
});
test('A5-203 failed immutable fetch may retry and does not retain a poisoned pending promise',async()=>{
 let calls=0;const h=harness(async()=>{calls++;if(calls===1)throw Error('offline');return new Response('recovered')});
 const first=await h.request('/_studio/retry-0123456789abcdef.js');
 assert.equal(first.status,503);
 await delay();
 const second=await h.request('/_studio/retry-0123456789abcdef.js');
 assert.equal(second.status,200);assert.equal(await second.text(),'recovered');
 assert.equal(calls,2);
});
