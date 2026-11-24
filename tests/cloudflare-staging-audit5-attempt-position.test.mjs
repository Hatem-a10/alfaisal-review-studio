import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="function inlineLatest(l,record=state[l.id]){const r=record?.learning||{},attempts=r.attempts||[],mcqs=record?.mcqs||[],last=typeof etExam==='undefined'?null:etExam;function fromExam(qid,t){if(!t?.at)return false;if(mcqs.some(v=>typeof v.source==='string'&&v.source.startsWith('Timed mock exam')&&v.createdAt===t.at&&typeof v.id==='string'&&v.id.endsWith(':'+qid)))return true;if(!last?.finishedAt||!last.trackerRecorded||!Array.isArray(last.questions)||Math.abs(Date.parse(t.at)-Date.parse(last.finishedAt))>10000)return false;const index=last.questions.findIndex(q=>q.id===qid),choice=index>=0?last.answers[index]:undefined;if(!Number.isInteger(choice))return false;const batchProven=t.at===last.finishedAt||Object.values(state).some(item=>(item?.mcqs||[]).some(v=>typeof v.source==='string'&&v.source.startsWith('Timed mock exam')&&v.createdAt===t.at&&typeof v.id==='string'&&last.questions.some(q=>v.id.endsWith(':'+q.id))));return batchProven&&attempts.some(a=>a.q===qid&&a.at===t.at&&a.choice===choice&&a.ok===(choice===last.questions[index].answer))}const m=new Map(Object.entries(r.results||{}).filter(([qid,t])=>!fromExam(qid,t)));for(const t of attempts){if(fromExam(t.q,t))continue;const prev=m.get(t.q);if(!prev||Date.parse(t.at)>=Date.parse(prev.at))m.set(t.q,t)}return m}",candidate=readFileSync(new URL('../public/inline-topics.js',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function inlineLatest('));
const at='2026-11-24T00:00:01Z',finishedAt='2026-11-24T00:00:00Z';
function fixture(source,n,{tracked=true,proof=true,direct=false}={}){
 let questionReads=0,stateReads=0;
 const questions=Array.from({length:n},(_,i)=>({get id(){questionReads++;return 'q'+i},answer:i%2}));
 const attempts=Array.from({length:n},(_,i)=>({q:'q'+i,c:'c'+i%5,at,choice:i%2,ok:true}));
 const record={learning:{attempts,results:Object.fromEntries(attempts.map(a=>[a.q,a]))},mcqs:direct?[{id:'mock:q0',source:'Timed mock exam',createdAt:at}]:[]};
 const state={'REN-A1':record};for(let i=0;i<70;i++)Object.defineProperty(state,'other'+i,{enumerable:true,get(){stateReads++;return {mcqs:i===69&&proof?[{id:'batch:q'+(n-1),source:'Timed mock exam',createdAt:at}]:[]}}});
 const etExam={finishedAt,trackerRecorded:tracked,questions,answers:Object.fromEntries(attempts.map((a,i)=>[i,a.choice]))};
 const context=vm.createContext({state,etExam});vm.runInContext(source+';this.run=()=>Array.from(inlineLatest({id:"REN-A1"}))',context);
 return {run:context.run,counts:()=>({questionReads,stateReads}),record,etExam};
}
const norm=x=>JSON.parse(JSON.stringify(x));
test('A5-151 exam position index preserves provenance exclusion and first duplicate position',()=>{
 for(const opts of [{},{tracked:false},{proof:false},{direct:true}]){const a=fixture(baseline,80,opts),b=fixture(candidate,80,opts);assert.deepEqual(norm(b.run()),norm(a.run()))}
 const a=fixture(baseline,10),b=fixture(candidate,10);
 for(const f of [a,b]){f.etExam.questions.unshift({id:'q1',answer:0});f.etExam.answers[0]=0;f.record.learning.attempts.push({q:'q1',c:'c1',at,choice:1,ok:true})}
 assert.deepEqual(norm(b.run()),norm(a.run()));
});
function median(fn){fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]}
test('A5-151 reuse position and proof lookups on a synthetic tracked mock',()=>{
 const a=fixture(baseline,200),b=fixture(candidate,200);assert.deepEqual(norm(b.run()),norm(a.run()));const before=a.counts(),after=b.counts();assert.ok(after.questionReads<before.questionReads);assert.ok(after.stateReads<before.stateReads);console.log(JSON.stringify({label:'A5-151 inline provenance lookup',baselineMedianMs:median(a.run),candidateMedianMs:median(b.run),baseline:before,candidate:after}));
});
