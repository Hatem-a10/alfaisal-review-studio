import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const oldDaily="function datedReviewBuckets(value=day){const all=tasks().filter(t=>t?.x&&reviewCalendarDay(t.date)&&!t.unscheduled);return {due:all.filter(t=>t.date===value&&!t.done),overdue:all.filter(t=>t.date<value&&!t.done),complete:all.filter(t=>t.date===value&&t.done)}}";
const oldWeak="function weakTopics(){const rows=[];for(const l of LEARNING.lessons.filter(item=>globalThis.reviewStudyItemVisible?.(item)!==false)){const ts=inlineTopicsFor(l),gs=inlineGroups(l).groups;ts.forEach((t,i)=>{const group=Array.isArray(gs[i])?gs[i]:[];const score=inlineTopicScore(l,group),ids=new Set(group.map(q=>q.id)),missed=wrongBank.entries.filter(x=>ids.has(x.question.id));const resolved=storeOptions().repairs?.[l.id+':'+i],latestAt=Math.max(0,...group.map(q=>Date.parse(inlineLatest(l).get(q.id)?.at)||0),...missed.map(v=>Date.parse(v.missedAt)||0));if((missed.length||score.total&&!score.complete)&&!(resolved?.percent>=85&&Date.parse(resolved.at)>=latestAt))rows.push({l,t,i,score,missed,qid:missed[0]?.question.id||group.find(q=>inlineLatest(l).get(q.id)?.ok===false)?.id||group[0]?.id})})}return rows.sort((a,b)=>b.missed.length-a.missed.length||a.score.percent-b.score.percent)}";
const source=(file,name)=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function '+name+'('));
const dailySource=source('daily-focus.js','datedReviewBuckets'),weakSource=source('study-workflows.js','weakTopics');
const normalize=x=>JSON.parse(JSON.stringify(x));
function median(fn){fn();const samples=[];for(let i=0;i<7;i++){const start=performance.now();fn();samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
function daily(source,rows){let reads=0;const context=vm.createContext({tasks:()=>rows,day:'2026-11-24',reviewCalendarDay:v=>{reads++;return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v}});vm.runInContext(source+';this.run=datedReviewBuckets',context);return {run:context.run,reads:()=>reads}}
test('A5-134 daily buckets retain stable order, validity and unscheduled handling',()=>{
 const rows=Array.from({length:8000},(_,i)=>i%13===0?null:{x:{id:'REN-'+i},date:i%7===0?'2026-11-31':i%9===0?'':i%3===0?'2026-11-24':i%3===1?'2026-11-23':'2026-11-25',done:i%5===0?'yes':null,unscheduled:i%11===0});
 delete rows[14];
 const a=daily(oldDaily,rows),b=daily(dailySource,rows);
 for(const date of [undefined,'2026-11-23','2026-11-24','2026-11-25'])assert.deepEqual(normalize(b.run(date)),normalize(a.run(date)));
 assert.equal(a.reads(),b.reads());
 console.log(JSON.stringify({label:'A5-134 daily buckets',baselineMedianMs:median(()=>a.run()),candidateMedianMs:median(()=>b.run()),baselineIntermediateEligibleArray:1,candidateIntermediateEligibleArray:0,rows:rows.length}));
});
function weak(source,fixture){
 let latestReads=0,wrongReads=0;
 const entries=fixture.entries.map(row=>({get question(){wrongReads++;return row.question},missedAt:row.missedAt}));
 const context=vm.createContext({LEARNING:{lessons:fixture.lessons},wrongBank:{entries},reviewStudyItemVisible:l=>!l.hidden,inlineTopicsFor:l=>l.topics,inlineGroups:l=>({groups:l.groups}),inlineTopicScore:(l,g)=>({total:g.length,complete:g.length>0&&g.every(q=>q.ok),percent:g.length?g.filter(q=>q.ok).length/g.length*100:0}),inlineLatest:l=>{latestReads++;return new Map(l.groups.flat().map(q=>[q.id,{at:q.at,ok:q.ok}]))},storeOptions:()=>({repairs:fixture.repairs})});
 vm.runInContext(source+';this.run=weakTopics',context);return {run:context.run,counts:()=>({latestReads,wrongReads})}
}
test('A5-024/A5-083 weak topic snapshot and wrong-answer index preserve ordered results',()=>{
 const lessons=Array.from({length:24},(_,i)=>({id:'REN-'+i,hidden:i%9===0,topics:Array.from({length:5},(_,j)=>'Topic '+j),groups:Array.from({length:5},(_,j)=>Array.from({length:10},(_,k)=>({id:'q'+((i*37+j*11+k)%500),ok:(i+j+k)%3===0,at:'2026-11-22T00:00:00Z'})))}));
 lessons[1].groups[2].push(lessons[1].groups[2][0]);lessons[2].groups[0]=[];
 const entries=Array.from({length:3000},(_,i)=>({question:{id:'q'+((i*71)%1000)},missedAt:i%2?'2026-11-21T00:00:00Z':'2026-11-23T00:00:00Z'}));
 const fixture={lessons,entries,repairs:{'REN-1:2':{percent:95,at:'2026-11-24T00:00:00Z'},'REN-3:1':{percent:84,at:'2026-11-24T00:00:00Z'}}};
 const a=weak(oldWeak,fixture),b=weak(weakSource,fixture);
 assert.deepEqual(normalize(b.run()),normalize(a.run()));
 const baseline=a.counts(),candidate=b.counts();assert.ok(candidate.latestReads<baseline.latestReads);assert.ok(candidate.wrongReads<baseline.wrongReads);
 console.log(JSON.stringify({label:'A5-024/A5-083 weak topics combined',baselineMedianMs:median(()=>a.run()),candidateMedianMs:median(()=>b.run()),baseline,candidate}));
});
