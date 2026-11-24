import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import * as policy from '../public/phase3-cache-policy.mjs';

const worker=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8');
const plain=worker.replace(/^import .* from '\.\/phase3-cache-policy\.mjs';\n/, '');
assert.notEqual(plain,worker,'benchmark must execute actual service-worker source');
function harness({networkLatency=3}={}){
 const handlers=new Map(),stores=new Map(),counts={network:0,cacheRead:0,cacheWrite:0};
 const key=request=>typeof request==='string'?new URL(request,'https://studio.test').href:request.url;
 const caches={
  async open(name){
   if(!stores.has(name))stores.set(name,new Map());
   const files=stores.get(name);
   return {
    async match(request){counts.cacheRead++;return files.get(key(request))?.clone()},
    async put(request,response){counts.cacheWrite++;files.set(key(request),response.clone())},
    async keys(){return [...files.keys()]},
    async delete(request){return files.delete(key(request))}
   };
  },
  async keys(){return [...stores.keys()]},
  async delete(name){return stores.delete(name)},
  async match(request,{cacheName}={}){return stores.get(cacheName)?.get(key(request))?.clone()}
 };
 const network=async request=>{
  counts.network++;
  if(networkLatency>0)await new Promise(resolve=>setTimeout(resolve,networkLatency));
  const path=typeof request==='string'?request:new URL(request.url).pathname;
  return new Response('js:'+path,{status:200,headers:{'Content-Type':'application/javascript','Content-Length':String(('js:'+path).length)}});
 };
 const self={location:{origin:'https://studio.test'},addEventListener:(event,fn)=>handlers.set(event,fn)};
 const context=vm.createContext({self,caches,fetch:network,Request,Response,Headers,URL,Map,Set,Promise,Number,Array,Object,...policy});
 vm.runInContext(plain,context);
 const fetchOne=async path=>{
  let reply=null;handlers.get('fetch')({request:new Request('https://studio.test'+path),clientId:'synthetic-device',respondWith:p=>{reply=p}});
  return reply?await reply:null;
 };
 return {fetchOne,counts,stores};
}
function median(values){const v=[...values].sort((a,b)=>a-b);return v[Math.floor(v.length/2)]}
test('A5-201 real service-worker cache-first route avoids repeat network requests for immutable public assets',async()=>{
 const h=harness(),path='/_studio/client-0123456789abcdef.js';
 const cold=await h.fetchOne(path);assert.equal(cold?.status,200);assert.ok((await cold.text()).includes(path));assert.equal(h.counts.network,1);
 const measured=[];for(let i=0;i<30;i++){const start=performance.now();const warm=await h.fetchOne(path);measured.push(performance.now()-start);assert.equal(warm.status,200);await warm.text()}
 assert.equal(h.counts.network,1);assert.equal(h.counts.cacheWrite,1);assert.equal(h.counts.cacheRead,31);
 assert.equal(h.stores.get(policy.RELEASE_CACHE+':core').size,1);
 console.log(JSON.stringify({label:'A5-201 synthetic Worker cache-first immutable asset',coldRequests:1,warmRequests:30,totalNetworkFetches:1,avoidedNetworkFetches:30,warmMedianMs:median(measured),realBrowserMeasurements:false,publicAssetsOnly:true}));
});
test('A5-201 cache-first behavior cannot accidentally intercept unauthorized account-specific resources',async()=>{
 const h=harness({networkLatency:0});
 assert.equal(await h.fetchOne('/api/progress'),null,'private sync API must bypass offline SW');
 assert.equal(await h.fetchOne('/api/site-assets/materials/private.pdf'),null,'unbound private resource must not access network/cache');
 assert.equal(h.counts.network,0);
 assert.equal(h.stores.size,0);
});
test('A5-201 multiple simultaneous cold immutable requests use the existing single-flight and preserve bytes',async()=>{
 const h=harness({networkLatency:4}),path='/_studio/course-REN-aaaaaaaaaaaaaaaa.js';
 const responses=await Promise.all(Array.from({length:12},()=>h.fetchOne(path)));
 const bodies=await Promise.all(responses.map(x=>x.text()));
 assert.ok(bodies.every(x=>x===bodies[0]));
 assert.equal(h.counts.network,1);
 assert.equal((await h.fetchOne(path)).status,200);
 assert.equal(h.counts.network,1);
 console.log(JSON.stringify({label:'A5-201 SW cold-start coalescing synthetic',parallelRequests:12,networkFetches:1,identicalResponses:true}));
});
