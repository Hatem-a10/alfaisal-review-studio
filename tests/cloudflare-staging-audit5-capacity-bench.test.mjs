import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {syntheticAcademicFixture} from '../scripts/audit5-measurements.mjs';
import {compressionProfile,boundedFixtureRows,sampleDurations} from '../scripts/audit5-capacity-bench.mjs';

const scheduleSource=readFileSync(new URL('../public/group-schedule-core.js',import.meta.url),'utf8');
test('A5-298 report CPU/transfer tradeoffs and verify lossless compression for academic text and media-like bytes',()=>{
 const academic=Buffer.from(JSON.stringify(syntheticAcademicFixture(20261124,{accounts:12,materials:1800,edits:300})));
 const randomish=Buffer.from(Array.from({length:120000},(_,i)=>(i*131+i*i*17)%256));
 const a=compressionProfile(academic),b=compressionProfile(randomish);
 assert.equal(a.rawBytes,academic.length);assert.equal(b.rawBytes,randomish.length);
 assert.ok(a.gzipBytes<a.rawBytes&&a.brotliBytes<a.rawBytes);
 assert.ok(a.gzipMs>=0&&a.brotliMs>=0&&b.gzipMs>=0&&b.brotliMs>=0);
 assert.ok(a.brotliSavedBytes>0);
 console.log(JSON.stringify({label:'A5-298 Node synthetic compression CPU and transfer cost',academic:a,mediaLike:b,nativeWorkerMeasurements:false,bytesVerified:true}));
});
function schedule(){
 const c=vm.createContext({Date,Map,Set,WeakMap,Array,Object,Number,RegExp,JSON,Math,module:{exports:{}}});
 vm.runInContext(scheduleSource,c);return c.module.exports;
}
const timetable=()=>{
 const groups=['M1','M2','F1','F2'];const dates=['2026-11-22','2026-11-29','2026-12-06','2026-12-13'];
 const events=[];let idx=0;
 for(const date of dates)for(const group of groups)for(let j=0;j<35;j++){
  const dt=new Date(date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+j%5);
  events.push({id:'class-'+idx++,title:'Renal practice',studentGroups:[group],studentSection:'A',date:dt.toISOString().slice(0,10),start:480+j*7,end:520+j*7,source:'Synthetic timetable',course:'REN',kind:'anatomy'});
 }
 return {events,weeks:dates.map(date=>({start:date,course:'REN'}))};
};
test('A5-292 concurrent-looking timetable transition bursts keep exact group isolation and bounded output',()=>{
 const core=schedule(),catalog=timetable(),groups=['M1','M2','F1','F2'],dates=catalog.weeks.map(w=>w.start);
 const run=()=>{let count=0;for(const date of dates)for(const group of groups){const events=core.selected(date,{studentGroup:group,studentSection:'A',englishEnabled:false},catalog,[],false);assert.ok(events.every(e=>e.studentGroups?.includes(group)));count+=events.length}return count};
 const first=run();assert.equal(first,560);const durations=sampleDurations(run,{runs:7});
 assert.equal(durations.count,7);assert.ok(durations.p95Ms>=durations.p50Ms);
 console.log(JSON.stringify({label:'A5-292 synthetic timetable transition CPU burst',groups:groups.length,weeks:dates.length,eventRows:catalog.events.length,matchedEvents:first,...durations,serverLoad:false}));
});
test('A5-300 adaptive regression dataset size caps high-cost synthetic runs without dropping coverage',()=>{
 const measuredRuns=[{sampleRows:800,sampleMs:8,targetMs:80},{sampleRows:1500,sampleMs:200,targetMs:80},{sampleRows:100,sampleMs:500,targetMs:80}];
 const picks=measuredRuns.map(boundedFixtureRows);
 assert.deepEqual(picks,[8000,600,128]);
 for(const count of picks){
  const a=syntheticAcademicFixture(20261124,{accounts:8,materials:count,edits:40});
  const b=syntheticAcademicFixture(20261124,{accounts:8,materials:count,edits:40});
  assert.deepEqual(a,b);
  assert.equal(a.records.length,count);
  assert.ok(a.records.some(x=>x.lecture_id==='ANKI'));
 }
 assert.equal(boundedFixtureRows({sampleRows:1000,sampleMs:.01}),20000);
 assert.throws(()=>boundedFixtureRows({sampleRows:100,sampleMs:0}),/Invalid/);
 console.log(JSON.stringify({label:'A5-300 bounded synthetic CI fixture sizing',minRows:128,maxRows:20000,calibratedCounts:picks,deterministic:true}));
});
