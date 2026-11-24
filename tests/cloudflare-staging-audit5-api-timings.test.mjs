import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApiTimingMetrics} from '../public/phase3-api-metrics.mjs';

const runtime=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
test('A5-108 accepted resources yield bounded labels and aggregates without retaining URLs or queries',()=>{
 const m=createApiTimingMetrics({origin:'https://staging.example',maxPerEndpoint:3});
 for(const [name,duration] of [
  ['/api/progress?account=private&since=9',11],
  ['/api/progress?account=different',20],
  ['/api/progress?token=secret',31],
  ['/api/progress',55],
  ['/api/materials?page=1',44],
  ['/api/decks',12],
  ['/api/account-key',8]
 ])assert.equal(m.record({name:'https://staging.example'+name,duration}),true);
 const s=m.summary();
 assert.deepEqual(Object.keys(s).sort(),['api-account','api-decks','api-materials','api-progress']);
 assert.equal(s['api-progress'].count,3);
 assert.equal(s['api-progress'].p50Ms,31);
 assert.equal(s['api-progress'].p95Ms,55);
 const raw=JSON.stringify(s);assert.doesNotMatch(raw,/token|secret|account=private|staging\.example/);
 console.log(JSON.stringify({label:'A5-108 private API timing (synthetic)',endpointCategories:Object.keys(s).length,retainedIdentifiers:0,retainedResourceURLs:0}));
});
test('A5-108 excludes cross origin, non-API, identity-bearing path and invalid observations',()=>{
 const m=createApiTimingMetrics({origin:'https://staging.example'});
 for(const name of ['https://evil.example/api/progress','https://staging.example/api/progress/student123','https://staging.example/api/admin-auth','https://staging.example/api/site-assets/x.pdf','https://staging.example/static.js']){
  assert.equal(m.record({name,duration:10}),false);
 }
 for(const duration of [-1,NaN,Infinity])assert.equal(m.record({name:'https://staging.example/api/progress',duration}),false);
 assert.equal(m.record({name:null,duration:1}),false);
 assert.deepEqual(m.summary(),{});
});
test('A5-108 measurements are strictly page-local, release resources on pagehide, and never transmit',()=>{
 assert.match(runtime,/createApiTimingMetrics\(\{origin:location\.origin\}\)/);
 assert.match(runtime,/reviewApiPerformance=\(\)=>apiTimingMetrics\.summary\(\)/);
 assert.match(runtime,/observer\.observe\(\{type:'resource',buffered:true\}\)/);
 assert.match(runtime,/observer\.disconnect\(\)/);
 const module=readFileSync(new URL('../public/phase3-api-metrics.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(module,/fetch\(|localStorage|sendBeacon|navigator\.send|XMLHttpRequest/);
});
