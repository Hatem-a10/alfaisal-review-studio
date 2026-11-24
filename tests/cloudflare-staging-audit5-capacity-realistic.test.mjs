import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const core=vm.runInNewContext(readFileSync(new URL('../public/study-autopilot-engine.js',import.meta.url),'utf8')+'\nStudyAutopilot',{structuredClone});
const plan=vm.runInNewContext(readFileSync(new URL('../public/assessment-plan.js',import.meta.url),'utf8')+'\nAssessmentPlan',{structuredClone});
const norm=x=>JSON.parse(JSON.stringify(x));
const median=fn=>{fn();const timings=[];for(let i=0;i<5;i++){const t=performance.now();fn();timings.push(performance.now()-t)}return timings.sort((a,b)=>a-b)[2]};
test('A5-124 representative agenda and saved-record capacity cost improves by sharing one day snapshot',()=>{
 const day='2026-11-24';
 const items=Array.from({length:75},(_,i)=>({id:'REN-A'+(i+1),course:'REN',group:'Anatomy',dates:['2026-11-01','2026-11-04','2026-11-09']}));
 const events=[{title:'REN Final Exam',date:'2026-12-14',detail:'09:00 am'}];
 const agenda=Array.from({length:85},(_,i)=>({date:'2026-11-'+String(24+i%6).padStart(2,'0'),start:480+i%9*45,end:540+i%9*45}));
 const records=Array.from({length:75},(_,i)=>({done:{0:'2026-11-23T20:00:00Z'},sessions:[{endedAt:'2026-11-24T11:00:00Z',seconds:150+i}]}));
 let baselineCalls=0,candidateCalls=0;
 const read=which=>(date,after=0)=>{
  if(which===0)baselineCalls++;else candidateCalls++;
  let cursor=480,free=0;
  for(const e of agenda){if(e.date!==date)continue;const begin=Math.max(480,e.start),end=Math.min(1380,e.end);if(begin>cursor)free+=begin-cursor;cursor=Math.max(cursor,end)}
  free+=Math.max(0,1380-cursor);
  let spent=0;
  for(const r of records){
   for(const [k,at] of Object.entries(r.done||{}))if(at.slice(0,10)===date)spent+=Number(k)===0?35:25;
   for(const session of r.sessions||[])if(session.endedAt.slice(0,10)===date)spent+=session.seconds/60;
  }
  return Math.max(0,Math.min(free,200-spent/records.length)-after/100);
 };
 const settings={budget:180,hard:()=>false,canSkip:()=>false};
 const before=()=>plan.spread(items,{},day,settings,events,()=>false,read(0),0);
 const after=()=>plan.spread(items,{},day,settings,events,()=>false,core.memoCapacity(read(1)),0);
 assert.deepEqual(norm(after()),norm(before()));
 assert.ok(candidateCalls<baselineCalls);
 const baselineMedianMs=median(before),candidateMedianMs=median(after);
 console.log(JSON.stringify({label:'A5-124 representative agenda capacity',baselineMedianMs,candidateMedianMs,baselineCalls,candidateCalls}));
 assert.ok(candidateMedianMs<baselineMedianMs,'The representative capacity workload should improve, unlike the deliberately cheap callback fixture');
});
