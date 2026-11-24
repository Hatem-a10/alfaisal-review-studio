import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as policy from '../public/phase3-cache-policy.mjs';
const source=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8');
const compiled=source.replace(/^import .*?;\n/,'');
function fixture({online=true,hasCore=true}={}){
 const listeners=new Map(),cacheContents=new Map();
 let networkCalls=0,coreLookups=0,privateLookups=0;
 const cache={
  match:async request=>{coreLookups++;const key=typeof request==='string'?request:new URL(request.url).pathname;return cacheContents.get(key)?.clone()},
  put:async()=>{},keys:async()=>[],delete:async()=>true
 };
 if(hasCore)cacheContents.set('/api/lesson-data',new Response('verified academic text'));
 const caches={open:async name=>{if(name!==policy.RELEASE_CACHE+':core')privateLookups++;return cache},keys:async()=>[],match:async()=>null};
 const self={location:{origin:'https://staging.example'},navigator:{onLine:online},addEventListener:(name,handler)=>listeners.set(name,handler)};
 const fetch=async()=>{networkCalls++;throw Error('synthetic offline network unavailable')};
 const env=vm.createContext({self,caches,fetch,Response,Request,Headers,URL,Map,Set,Promise,...policy});
 vm.runInContext(compiled,env);
 async function get(path){
  let pending;
  listeners.get('fetch')({request:new Request('https://staging.example'+path),clientId:'synthetic',respondWith:p=>{pending=p}});
  return pending?await pending:null;
 }
 return {get,reads:()=>({networkCalls,coreLookups,privateLookups})};
}
test('A5-209 known offline core text returns same release-cached body without retrying failed network',async()=>{
 const offline=fixture({online:false}),response=await offline.get('/api/lesson-data');
 assert.equal(response?.status,200);assert.equal(await response.text(),'verified academic text');
 assert.equal(offline.reads().networkCalls,0);
 assert.equal(offline.reads().privateLookups,0);
 assert.ok(offline.reads().coreLookups>=1);
 const online=fixture({online:true});
 const failed=await online.get('/api/lesson-data');assert.equal(failed.status,200);
 assert.equal(await failed.text(),'verified academic text');
 assert.equal(online.reads().networkCalls,1,'online policy retains network-first verification');
 console.log(JSON.stringify({label:'A5-209 unversioned public core offline cached hit',baselineFailedNetworkProbes:1,optimizedFailedNetworkProbes:0,publicOnly:true}));
});
test('A5-209 cache misses retain prior network/fallback path, and account-private APIs remain isolated',async()=>{
 const offline=fixture({online:false,hasCore:false});
 const missed=await offline.get('/api/lesson-data');
 assert.equal(missed.status,503);assert.equal(offline.reads().networkCalls,1);
 const privateResponse=await offline.get('/api/site-assets/materials/synthetic.pdf');
 assert.equal(privateResponse,null,'unbound private path must not be fulfilled or fetched');
 assert.equal(offline.reads().privateLookups,0);
 const denied=await offline.get('/api/progress');assert.equal(denied,null);
 assert.equal(offline.reads().networkCalls,1);
});
test('A5-209 only checks offline state for public core resources, not navigation or private',()=>{
 const code=source.slice(source.indexOf("const cache=await caches.open"),source.indexOf("let denied=false"));
 assert.match(code,/if\(kind==='core'&&self\.navigator\?\.onLine===false\)/);
 assert.match(code,/cache\?\.match\(request,\{ignoreSearch:true\}\)/);
 assert.ok(source.includes("const CORE=RELEASE_CACHE+':core'"));
});
