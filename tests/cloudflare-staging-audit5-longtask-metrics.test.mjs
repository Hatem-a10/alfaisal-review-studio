import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLongTaskMetrics} from '../public/phase3-longtask-metrics.mjs';

test('A5-282 asynchronous long tasks use start-time view rather than callback-time view',()=>{
 const m=createLongTaskMetrics();
 m.enter('learning',0);m.enter('practice',100);m.enter('library',200);
 assert.equal(m.record({startTime:70,duration:60}),true);
 assert.equal(m.record({startTime:160,duration:85}),true);
 assert.equal(m.record({startTime:230,duration:130}),true);
 assert.equal(m.record({startTime:180,duration:70}),true);
 assert.deepEqual(m.summary(),{learning:{count:1,p50Ms:60,p95Ms:60,minMs:60,maxMs:60},practice:{count:2,p50Ms:70,p95Ms:85,minMs:70,maxMs:85},library:{count:1,p50Ms:130,p95Ms:130,minMs:130,maxMs:130}});
});
test('A5-282 invalid and early entries ignored, bounded telemetry and no identifiers',()=>{
 const m=createLongTaskMetrics();
 assert.equal(m.record({startTime:10,duration:70}),false);
 m.enter('learning',100);
 for(const e of [{startTime:50,duration:60},{startTime:101,duration:49},{startTime:101,duration:Infinity},{startTime:101,duration:60001}])assert.equal(m.record(e),false);
 assert.equal(m.record({startTime:110,duration:50}),true);
 for(let i=0;i<200;i++)m.record({startTime:110,duration:100+i});
 assert.equal(m.summary().learning.count,120);
 for(const invalid of ['MOL-14','account:secret','UPPER','student 123'])m.enter(invalid,300);
 assert.deepEqual(Object.keys(m.summary()),['learning']);
});
test('A5-282 integration uses supported browser observer and pagehide cleanup',()=>{
 const source=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
 assert.match(source,/PerformanceObserver\.supportedEntryTypes\?\.includes\('longtask'\)/);
 assert.match(source,/longTaskMetrics\.record\(entry\)/);
 assert.match(source,/longTaskMetrics\.enter\(view,started\)/);
 assert.match(source,/observer\.disconnect\(\)/);
 assert.match(source,/window\.reviewLongTaskPerformance=\(\)=>longTaskMetrics.summary\(\)/);
});
