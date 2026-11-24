import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNavigationMetrics} from '../public/phase3-navigation-metrics.mjs';

test('A5-281 navigation p50 and p95 track distinct quantiles and bounded recent samples',()=>{
 const metrics=createNavigationMetrics({maxPerView:100,maxViews:3});
 for(let i=1;i<=200;i++)assert.equal(metrics.record('learning',i),true);
 const first=metrics.summary();
 assert.deepEqual(first.learning,{count:100,p50Ms:150,p95Ms:195,minMs:101,maxMs:200});
 first.learning.p50Ms=0;assert.equal(metrics.summary().learning.p50Ms,150);
 for(const [view,value] of [['practice',10],['library',20],['anki',30]])metrics.record(view,value);
 assert.deepEqual(Object.keys(metrics.summary()),['practice','library','anki']);
});
test('A5-281 rejects identifiers, non-finite values and out-of-bounds timings',()=>{
 const metrics=createNavigationMetrics();
 for(const [view,ms] of [['REN-A1',20],['account:private',10],['lecture 1',10],['practice',NaN],['practice',Infinity],['practice',-1],['practice',90000]])assert.equal(metrics.record(view,ms),false);
 assert.equal(Object.keys(metrics.summary()).length,0);
 metrics.record('practice',0);metrics.record('practice',1.11334);
 assert.deepEqual(metrics.summary().practice,{count:2,p50Ms:0,p95Ms:1.11,minMs:0,maxMs:1.11});
});
test('A5-281 metrics are in memory only and collected on route transitions',()=>{
 const runtime=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
 assert.match(runtime,/createNavigationMetrics\(\)/);
 assert.match(runtime,/window.reviewNavigationPerformance=\(\)=>navigationMetrics.summary\(\)/);
 assert.match(runtime,/requested!==lastMeasuredView/);
 assert.match(runtime,/navigationMetrics.record\(view,performance.now\(\)-started\)/);
 assert.doesNotMatch(runtime,/sendBeacon\(|fetch\(['"]\/api\/metrics/);
});
