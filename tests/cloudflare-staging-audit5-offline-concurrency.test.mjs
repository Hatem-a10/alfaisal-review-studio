import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cacheKind,RELEASE_CACHE,offlinePrecacheWidth,prioritizeOfflineAssets} from '../public/phase3-cache-policy.mjs';

const source=readFileSync(new URL('../public/review-sw.js',import.meta.url),'utf8').replace(/^import .*?;\n/,'');
function fixture(count=24,delay=7){
 const routes=Array.from({length:count},(_,i)=>'/resource'+i+'.js');
 let inFlight=0,maxInFlight=0,writes=0,manifestCalls=0,assetCalls=0;
 let install;
 const cache={put:async()=>{writes++},keys:async()=>[],match:async()=>null};
 const self={location:{origin:'https://example.invalid'},skipWaiting:async()=>{},addEventListener:(type,fn)=>{if(type==='install')install=fn}};
 const fakeFetch=async path=>{
  if(path==='/offline-assets.json'){manifestCalls++;return {ok:true,json:async()=>({assets:routes})}}
  inFlight++;assetCalls++;maxInFlight=Math.max(maxInFlight,inFlight);
  await new Promise(resolve=>setTimeout(resolve,delay));
  inFlight--;
  return new Response('public '+path);
 };
 const context=vm.createContext({cacheKind,RELEASE_CACHE,offlinePrecacheWidth,prioritizeOfflineAssets,validAccount:()=>false,privateCacheName:()=>'',privateCacheNames:()=>[],obsoleteCoreCache:()=>false,fitsCache:async()=>true,Map,Set,Response,self,fetch:fakeFetch,caches:{open:async()=>cache},URL,Promise,setTimeout});
 vm.runInContext(source,context);
 return {run:async()=>{let pending;install({waitUntil:p=>pending=p});await pending},reads:()=>({maxInFlight,assetCalls,writes,manifestCalls}),routes};
}
test('A5-210 existing offline release manifest warmup stays inside eight-way network cap',async()=>{
 const run=fixture();
 await run.run();
 assert.deepEqual(run.reads(),{maxInFlight:8,assetCalls:24,writes:24,manifestCalls:1});
});
test('A5-210 measure fixed-latency batched warmup against sequential fetch baseline',async()=>{
 const duration=7,n=24,run=fixture(n,duration),start=performance.now();
 await run.run();const optimizedMs=performance.now()-start;
 const baselineStart=performance.now();for(let i=0;i<n;i++)await new Promise(resolve=>setTimeout(resolve,duration));
 const baselineMs=performance.now()-baselineStart;
 assert.equal(run.reads().maxInFlight,8);
 console.log(JSON.stringify({label:'A5-210 8-way offline precache warmup (measurement only)',baselineSequentialMs:baselineMs,batchOfEightMs:optimizedMs,assets:n,peakInflight:run.reads().maxInFlight,simulatedDelayMs:duration}));
});
