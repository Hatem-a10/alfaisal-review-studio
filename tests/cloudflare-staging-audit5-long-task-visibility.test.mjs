import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLongTaskMetrics} from '../public/phase3-long-task-metrics.mjs';
class FakeObserver{
 static instances=[];
 constructor(callback){this.callback=callback;this.disconnected=false;FakeObserver.instances.push(this)}
 observe(options){this.options=options}
 fire(entries){this.callback({getEntries:()=>entries})}
 disconnect(){this.disconnected=true}
}
test('A5-282 long tasks retain bounded per-view duration distributions only',()=>{
 let view='learning';const metrics=createLongTaskMetrics({getView:()=>view,Observer:FakeObserver,maxPerView:4,maxViews:2});
 assert.equal(metrics.start(),true);assert.equal(metrics.start(),false);assert.deepEqual(FakeObserver.instances.at(-1).options,{type:'longtask'});
 const o=FakeObserver.instances.at(-1);
 o.fire([100,50,20,200,300].map(duration=>({entryType:'longtask',duration,name:'sensitive task contents'})));
 assert.deepEqual(metrics.summary().learning,{count:4,p50Ms:50,p95Ms:300,minMs:20,maxMs:300});
 view='practice';o.fire([{entryType:'resource',duration:400},{entryType:'longtask',duration:75}]);
 assert.deepEqual(metrics.summary().practice,{count:1,p50Ms:75,p95Ms:75,minMs:75,maxMs:75});
 view='anki';o.fire([{entryType:'longtask',duration:90}]);
 assert.deepEqual(Object.keys(metrics.summary()),['practice','anki']);
 metrics.stop();assert.equal(o.disconnected,true);
 assert.deepEqual(JSON.stringify(metrics.summary()).includes('sensitive'),false);
});
test('A5-282 unavailable performance observers and personal view IDs are ignored',()=>{
 let view='REN-A1';
 const noObserver=createLongTaskMetrics({getView:()=>view,Observer:null});assert.equal(noObserver.start(),false);noObserver.stop();
 const metrics=createLongTaskMetrics({getView:()=>view,Observer:FakeObserver});assert.equal(metrics.start(),true);
 const o=FakeObserver.instances.at(-1);
 o.fire([{entryType:'longtask',duration:100},{entryType:'longtask',duration:-1},{entryType:'longtask',duration:Infinity}]);
 assert.deepEqual(metrics.summary(),{});
 view='learning';o.fire([{entryType:'longtask',duration:55}]);assert.equal(metrics.summary().learning.count,1);
});
test('A5-282 in-memory-only instrumentation is independent of account and network',()=>{
 const runtime=readFileSync(new URL('../public/phase3-runtime.mjs',import.meta.url),'utf8');
 const source=readFileSync(new URL('../public/phase3-long-task-metrics.mjs',import.meta.url),'utf8');
 assert.match(runtime,/window.reviewLongTaskPerformance=\(\)=>longTaskMetrics.summary\(\)/);
 assert.match(runtime,/pagehide.*longTaskMetrics.stop/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|sendBeacon|fetch\(/);
});
