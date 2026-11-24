import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

const source=readFileSync(new URL('../public/study-autopilot-engine.js',import.meta.url),'utf8');
const candidate=vm.runInNewContext(source+';StudyAutopilot',{structuredClone});
const originals=readFileSync(new URL('../public/study-autopilot.js',import.meta.url),'utf8');
const assessment=vm.runInNewContext(readFileSync(new URL('../public/assessment-plan.js',import.meta.url),'utf8')+';AssessmentPlan',{structuredClone});
const normalize=x=>JSON.parse(JSON.stringify(x));

test('calendar availability memo is scoped to a single planning run and includes after-minute',()=>{
 let calls=0;const capacity=(d,after)=>{calls++;return d==='2026-11-24'?Math.max(0,240-after):100};
 const first=candidate.memoCapacity(capacity);
 assert.equal(first('2026-11-24',10),230);assert.equal(first('2026-11-24',10),230);
 assert.equal(first('2026-11-24',11),229);assert.equal(first('2026-11-25',10),100);
 assert.equal(first('2026-11-25'),100);assert.equal(first('2026-11-25'),100);assert.equal(calls,4);
 const second=candidate.memoCapacity(capacity);assert.equal(second('2026-11-24',10),230);assert.equal(calls,5);
 let throwCount=0;const bad=candidate.memoCapacity(()=>{throwCount++;throw Error('temporary')});
 assert.throws(()=>bad('2026-11-24'),/temporary/);assert.throws(()=>bad('2026-11-24'),/temporary/);assert.equal(throwCount,2);
});

test('runtime wiring uses run-local availability for all planning paths',()=>{
 assert.match(originals,/const capacityForRun=StudyAutopilot\.memoCapacity\(capacity\)/);
 assert.match(originals,/d=>capacityForRun\(d,d===current\?clock.minute:0\)/);
 assert.match(originals,/AssessmentPlan\.spread\([^\n]*capacityForRun,clock\.minute\)/);
 assert.match(originals,/automaticRebalance\([^\n]*capacityForRun,/);
});

function caseData(){
 const day='2026-11-24';
 const items=Array.from({length:140},(_,i)=>({id:'MOL-'+(i+1),course:'MOL',group:'Biochemistry',dates:['2026-11-01','2026-11-05','2026-11-12']}));
 const events=[{title:'MOL Final Exam',date:'2026-12-20',detail:'10:00 to 12:00'}];
 return {day,items,events};
}
function median(fn){fn();const samples=[];for(let i=0;i<5;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[2]}

test('A5 planning daily availability cache preserves assignment and reduces repeated scans',()=>{
 const {day,items,events}=caseData();
 let baselineCalls=0,candidateCalls=0;
 const readBaseline=(date,after)=>{baselineCalls++;return date<'2026-12-15'?120-after/100:50};
 const readCandidate=(date,after)=>{candidateCalls++;return date<'2026-12-15'?120-after/100:50};
 const base=()=>assessment.spread(items,{},day,{budget:180},events,()=>false,readBaseline,0);
 const run=()=>assessment.spread(items,{},day,{budget:180},events,()=>false,candidate.memoCapacity(readCandidate),0);
 assert.deepEqual(normalize(run()),normalize(base()));
 assert.ok(candidateCalls<baselineCalls,{candidateCalls,baselineCalls});
 const before=median(base),after=median(run);
 console.log(JSON.stringify({label:'Audit5 planner capacity memo (extra; no counted register ID)',baselineMedianMs:before,candidateMedianMs:after,baselineCapacityReads:baselineCalls,candidateCapacityReads:candidateCalls}));
});

test('A5-124 realistic per-date record scans amortize under repeated placement probes',()=>{
 const {day,items,events}=caseData();
 const entries=Array.from({length:400},(_,i)=>({dates:['2026-11-'+String(i%30+1).padStart(2,'0'),'2026-12-'+String(i%20+1).padStart(2,'0')],done:i%3===0}));
 const sessions=Array.from({length:70},(_,i)=>({date:'2026-11-'+String(i%30+1).padStart(2,'0'),start:540+i%7*45,end:600+i%7*45}));
 let baseReads=0,optimizedReads=0;
 const read=side=>(date,after=0)=>{
  if(side==='baseline')baseReads++;else optimizedReads++;
  let spent=0;
  for(const row of entries)if(!row.done&&row.dates.includes(date))spent+=10;
  let blocked=0;
  for(const event of sessions)if(event.date===date)blocked+=(event.end-event.start)/20;
  return Math.max(0,Math.min(120-spent/10-blocked,180-after/40));
 };
 const before=()=>assessment.spread(items,{},day,{budget:180},events,()=>false,read('baseline'),0);
 const after=()=>assessment.spread(items,{},day,{budget:180},events,()=>false,candidate.memoCapacity(read('optimized')),0);
 assert.deepEqual(normalize(after()),normalize(before()));
 assert.ok(optimizedReads*10<baseReads,{baseReads,optimizedReads});
 const baselineMs=median(before),candidateMs=median(after);
 console.log(JSON.stringify({label:'A5-124 realistic planning capacity',baselineMedianMs:baselineMs,candidateMedianMs:candidateMs,baselineReads:baseReads,optimizedReads,records:entries.length,campusEvents:sessions.length}));
});
