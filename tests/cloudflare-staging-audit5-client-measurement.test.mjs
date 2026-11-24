import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {packSource} from '../scripts/course-packs.mjs';
import {cacheKind} from '../public/phase3-cache-policy.mjs';
import {quantiles,measureOperation,startupPhases,summarizeStartupModes,CacheHitMeter} from '../scripts/audit5-client-measurements.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('A5-286 measures parsing a real generated course-pack expression without executing student data',()=>{
 const entries=Array.from({length:900},(_,i)=>[i,{id:'MOL-S'+i,title:'Synthetic metabolism section '+i,body:('Protein, lipid and energy pathway. ').repeat(9),options:['A','B','C','D']}]);
 const code=packSource('MOL',{'LEARNING.lessons':{kind:'array',entries}},[],[]);
 assert.ok(Buffer.byteLength(code)>150000);
 const samples=measureOperation(()=>new vm.Script(code,{filename:'synthetic-MOL-course-pack.js'}),{runs:9});
 assert.equal(samples.n,9);assert.ok(samples.p95>=samples.p50&&samples.p50>=0);
 const loaded=[],context=vm.createContext({LEARNING:{lessons:[]},__reviewMergeArray:(_key,array,items)=>array.push(...items.map(x=>x[1])),__reviewCourseReady:course=>loaded.push(course)});
 new vm.Script(code).runInContext(context);
 assert.deepEqual(loaded,['MOL']);assert.equal(context.LEARNING.lessons.length,900);
 assert.equal(context.LEARNING.lessons[899].id,'MOL-S899');
 console.log(JSON.stringify({label:'A5-286 Node VM course-pack parse proxy (not browser main-thread telemetry)',sourceBytes:Buffer.byteLength(code),sections:900,...samples}));
});
test('A5-288 cold and warm bootstrap summaries are separate and use actual startup mark names',()=>{
 const boot=read('public/device-storage.js');
 for(const mark of ['studio-bootstrap-start','studio-account-verified','studio-device-hydrated','studio-scripts-loaded'])assert.ok(boot.includes("'"+mark+"'"),mark);
 const stamps=(account,device,scripts)=>['studio-bootstrap-start','studio-account-verified','studio-device-hydrated','studio-scripts-loaded'].map((name,i)=>({name,startTime:[0,account,device,scripts][i]}));
 const cold=Array.from({length:8},(_,i)=>startupPhases(stamps(90+i,210+i,290+i),{mode:'cold'}));
 const warm=Array.from({length:8},(_,i)=>startupPhases(stamps(15+i,40+i,65+i),{mode:'warm'}));
 const result=summarizeStartupModes([...cold,...warm]);
 assert.equal(result.cold.total.n,8);assert.equal(result.warm.total.n,8);
 assert.ok(result.cold.total.p50>result.warm.total.p95);
 assert.equal(result.cold.total.p50,293);assert.equal(result.warm.total.p50,68);
 assert.equal(startupPhases(stamps(30,20,60),{mode:'cold'}),null);
 assert.equal(summarizeStartupModes(cold).warm,null);
 assert.throws(()=>quantiles([]));
 console.log(JSON.stringify({label:'A5-288 separate cold/warm boot marks (deterministic simulated timings)',coldTotalMs:result.cold.total,warmTotalMs:result.warm.total,persisted:false}));
});
test('A5-293 cache-hit measurement counts only actual cache-eligible resource classes',()=>{
 const policy=read('public/phase3-cache-policy.mjs');
 assert.match(policy,/function cacheKind\(/);
 const urls=[
 ['/index.html',false],['/',true],
 ['/_studio/client-0123456789abcdef.js',true],
 ['/_studio/client-ffffffffffaaaaaa.js',false],
 ['/api/site-assets/materials/page.pdf',true],
 ['/api/site-assets/materials/figure.png',false],
 ['/api/progress',false],['/api/account-key',true],['/signin',true]
 ];
 const meter=new CacheHitMeter();
 for(const [path,hit] of urls){const kind=cacheKind(path);if(kind)meter.record(kind,hit)}
 const summary=meter.summary();
 assert.deepEqual(summary.navigation,{hits:1,misses:1,requests:2,hitRatio:.5});
 assert.deepEqual(summary.core,{hits:1,misses:1,requests:2,hitRatio:.5});
 assert.deepEqual(summary.private,{hits:1,misses:1,requests:2,hitRatio:.5});
 assert.equal(summary.progress,undefined);
 assert.throws(()=>meter.record('account-id',true));
 assert.throws(()=>meter.record('private','hit'));
 console.log(JSON.stringify({label:'A5-293 SW cache hit ratio by eligible resource class (synthetic accesses)',...summary,deniedAndAuthPathsExcluded:true}));
});
