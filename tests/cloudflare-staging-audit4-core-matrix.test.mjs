import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {solveTarget} from '../public/grade-solver.mjs';
import {pacingSummary} from '../public/phase2-pacing.mjs';
import {matchDecks} from '../public/phase3-crosslinks.mjs';
import {ProgressDelta} from '../lib/progress-delta.js';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const classic=(file,name)=>runInNewContext(read(file)+'\n'+name,{structuredClone});
const A=classic('assessment-plan.js','AssessmentPlan'),E=classic('exam-engine.js','ExamEngine'),L=classic('learn-engine.js','Learn'),C=classic('progress-delta.js','ProgressDelta');
const q={id:'q',answer:1,concept:'c',question:'Question',lectureIds:['REN-A1'],options:['A','B','C'],explanation:'Explanation',reasons:['A','B','C']};
test('Renal assessment catalog, explicit course identity and 12-hour time parsing',()=>{
 const items=[{id:'REN-A1',course:'REN',dates:[]}],events=[{date:'2026-12-01',title:'Renal Final Exam',course:'REN',detail:'4:00–5:30 pm'}];
 const next=A.nextByCourse(events,items,'2026-12-01',1000);
 assert.equal(next.length,1);assert.equal(next[0].course,'REN');assert.equal(next[0].endMinute,1050);assert.equal(next[0].lectureIds[0],'REN-A1');
 assert.equal(A.nextByCourse(events,items,'2026-12-01',1050).length,0);
 assert.equal(A.endMinute({detail:'4:00 to 5:30 pm'}),1050);
 assert.equal(A.endMinute({detail:'11:00–12:00 am'}),0);
 assert.equal(A.endMinute({detail:'12:00–13:90'}),1440);
});
test('unscheduled Renal canonical dates do not create invalid dates during planning',()=>{
 const item={id:'REN-A1',course:'REN',dates:[]},records={'REN-A1':{dates:['2026-11-25','2026-11-27','2026-12-01']}};
 const r=A.spread([item],records,'2026-11-24',{budget:180},[],()=>false,()=>180);
 assert.ok(r.changes.every(c=>/^\d{4}-\d{2}-\d{2}$/.test(c.after)));
 assert.equal(r.unplaced.length,0);
 const zero=A.spread([item],records,'2026-11-24',{budget:0},[],()=>false,()=>180);
 assert.equal(zero.changes.length,0);assert.equal(zero.unplaced.length,3);
});
test('Renal Anki crosslinks match the registered course and exact lecture number',()=>{
 const lessons=[{id:'REN-A1',title:'Renal anatomy'},{id:'REN-A2',title:'Renal histology'}];
 const result=matchDecks(lessons,[{id:'r',name:'REN 123 A1',cards:[{id:'1'},{id:'2',schedule:{queue:-1}}]}]);
 assert.deepEqual(result.get('REN-A1')[0].cardIds,['1']);assert.equal(result.has('REN-A2'),false);
});
test('invalid mark fields are not silently interpreted as zero',()=>{
 const row={id:'a',weight:100,total:100,earned:80,completed:true};
 for(const earned of ['',null,undefined,false])assert.equal(solveTarget([{...row,earned}],65).valid,false);
 assert.equal(solveTarget([row],true).valid,false);assert.equal(solveTarget([row],'toString').valid,false);
 assert.equal(solveTarget([null],65).valid,false);
 assert.equal(solveTarget([row],'.5').valid,true);
});
test('invalid answer and timing indices cannot enter a saved exam',()=>{
 const e={questions:[q],answers:{}};
 for(const [i,c] of [[-1,0],[1,0],[0,3],[0,-1],[0,1.2],[0,null]])assert.equal(E.recordChange(e,i,c),false);
 assert.equal(Object.keys(e.answers).length,0);
 E.addActiveTime(e,-1,200);E.addActiveTime(e,1,200);assert.equal(e.xp,undefined);
 assert.equal(E.recordChange(e,0,1),true);assert.equal(e.answers[0],1);
 e.finishedAt='2026-11-24T10:00:00Z';assert.equal(E.recordChange(e,0,2),false);assert.equal(e.answers[0],1);
});
test('non-finite timing and fractional switch count do not distort pacing',()=>{
 const p=pacingSummary({questions:[q,q],xp:{activeMs:{0:Infinity,1:1500},rightToWrong:{0:Infinity,1:1.9}}});
 assert.equal(p.totalMs,1500);assert.equal(p.averageMs,1500);assert.equal(p.switches,1);
});
test('learning records preserve newer answers and do not touch inherited concept names',()=>{
 const newer='2026-11-24T12:00:00Z',older='2026-11-24T11:00:00Z';
 const first=L.record({},q,1,newer),second=L.record({learning:first},q,0,older);
 assert.equal(second.results.q.ok,true);assert.equal(second.results.q.at,newer);
 const result=L.status({facts:[{id:'constructor'},{id:'__proto__'}]},{learning:{results:{a:{c:'constructor',ok:true,at:newer},b:{c:'__proto__',ok:true,at:newer}}}},'2026-11-24');
 assert.equal(result.known,2);assert.equal(result.stats.constructor.total,1);assert.equal(result.stats.__proto__.total,1);
});
test('delta rejects malformed operations and uses own keys',()=>{
 const state={records:{},settings:{},extras:{version:1,stores:{}}};
 for(const patch of [[null],[{path:['records','a'],remove:true,value:1}],[{path:['records','a'],value:undefined}],[{path:['records','constructor','x'],value:1}]])for(const D of [ProgressDelta,C])assert.throws(()=>D.apply(state,patch));
 const next={...state,settings:{toString:'own setting'}};
 for(const D of [ProgressDelta,C])assert.equal(D.apply(state,D.diff(state,next)).settings.toString,'own setting');
});
// 500 independently parameterized cases supplement the targeted regressions. They are
// test scenarios, not 500 claimed defects. Expected values come from simple independent formulas.
for(let i=0;i<100;i++){
 const weight=1+i%99,earned=(i*7)%101,target=(i*13)%101;
 test('matrix grade '+i,()=>{
  const rows=[{weight,total:100,earned,completed:true},{weight:100-weight,total:100}];
  const r=solveTarget(rows,target),banked=weight*earned/100,remaining=100-weight;
  assert.equal(r.valid,true);assert.ok(Math.abs(r.banked-banked)<1e-8);
  assert.equal(r.status,banked>=target?'secured':banked+remaining+1e-9<target?'impossible':'possible');
  assert.ok(Math.abs(r.requiredPercent-Math.max(0,target-banked)*100/remaining)<1e-8);
 });
 test('matrix patch round trip '+i,()=>{
  const before={records:{'REN-A1':{notes:'old '+i,done:{0:'2026-11-24'},resources:['a']}},settings:{theme:'light',n:i},extras:{version:1,stores:{}}};
  const after={records:{'REN-A1':{notes:'new '+i,done:{1:'2026-11-25'},resources:['a','b']},'REN-A2':{notes:String(i)}},settings:{theme:i%2?'dark':'light',n:i+1},extras:before.extras};
  for(const D of [ProgressDelta,C])assert.equal(JSON.stringify(D.apply(before,D.diff(before,after))),JSON.stringify(after));
  assert.equal(before.records['REN-A1'].notes,'old '+i);
 });
 test('matrix time '+i,()=>{
  const hour=i%12+1,minute=(i*11)%60,period=i%2?'pm':'am';
  assert.equal(A.endMinute({detail:'1:00 to '+hour+':'+String(minute).padStart(2,'0')+' '+period}),((hour%12)+(period==='pm'?12:0))*60+minute);
 });
 test('matrix pacing '+i,()=>{
  const a=(i+1)*100,b=(i+2)*200,ms={0:a,2:b};
  const p=pacingSummary({questions:[q,q,q,q],xp:{activeMs:ms}});
  assert.equal(p.timedQuestions,2);assert.equal(p.totalMs,a+b);assert.equal(p.averageMs,(a+b)/2);
 });
 test('matrix graded answers '+i,()=>{
  const qs=Array.from({length:1+i%20},(_,j)=>({...q,id:'q'+j,answer:j%3}));
  const answers=Object.fromEntries(qs.flatMap((x,j)=>(j+i)%4===0?[]:[[j,(j+i)%3]]));
  const g=E.grade({questions:qs,answers});
  const actual=Object.keys(answers).length,correct=qs.filter((x,j)=>answers[j]===x.answer).length;
  assert.equal(g.total,actual);assert.equal(g.correct,correct);assert.equal(g.unanswered,qs.length-actual);
  assert.equal(g.percent,actual?Math.round(correct*100/actual):0);
 });
}
