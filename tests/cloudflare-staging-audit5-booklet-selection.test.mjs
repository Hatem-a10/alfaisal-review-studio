import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {selectBooklet as candidate} from '../public/phase2-practice-core.mjs';
const source="function bookletTypeAllowed(q,state){return (q.type==='mcq'?state.bookletIncludeMCQ!==false:(q.type==='ospe'||/^cvp19-ospe-/.test(q.id)?state.bookletIncludeOSPE!==false:state.bookletIncludeSAQ!==false))}\nfunction selectBooklet(questions,state){const entries=state.booklet||{},filter=state.filter||'all',pending=q=>!entries[q.id]?.completed||entries[q.id]?.correct===false;let list=questions.filter(q=>bookletTypeAllowed(q,state)&&(!state.bookletDiscipline||state.bookletDiscipline==='all'||q.discipline===state.bookletDiscipline)).filter(q=>filter==='all'||(filter==='wrong'?entries[q.id]?.correct===false:filter==='completed'?!!entries[q.id]?.completed&&entries[q.id]?.correct!==false:pending(q)));if(state.bookletRandom){const rank=new Map((state.bookletRandomOrder||[]).map((id,i)=>[id,i]));const originalRank=new Map(questions.map((q,i)=>[q.id,i]));list.sort((a,b)=>(rank.get(a.id)??(rank.size+originalRank.get(a.id)))-(rank.get(b.id)??(rank.size+originalRank.get(b.id))))}if(filter==='unanswered'||filter==='wrong'){const rank=new Map((state.bookletQueue||[]).map((id,i)=>[id,i]));list=list.map((q,i)=>({q,i})).sort((a,b)=>(rank.get(a.q.id)??100000+a.i)-(rank.get(b.q.id)??100000+b.i)).map(x=>x.q)}let position=Math.min(Math.max(Math.trunc(Number(state.position)||0),0),Math.max(list.length-1,0)),pinned=(state.bookletFeedbackId||state.bookletViewId)&&questions.find(q=>q.id===(state.bookletFeedbackId||state.bookletViewId));return {list,position,question:(pinned&&bookletTypeAllowed(pinned,state)&&(!state.bookletDiscipline||state.bookletDiscipline==='all'||pinned.discipline===state.bookletDiscipline)?pinned:null)||list[position]||null}}";
const baseline=vm.runInNewContext(source+'\nselectBooklet');
const norm=x=>({list:x.list.map(q=>q.id+'|'+q.seq),position:x.position,question:x.question?.id+'|'+x.question?.seq});
const median=fn=>{fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]};
const questions=Array.from({length:12000},(_,i)=>({id:'Q'+(i%9000),seq:i,type:['mcq','saq','ospe'][i%3],discipline:['Anatomy','Physiology','Histology'][i%3]}));
const entries=Object.fromEntries(questions.filter((_,i)=>i%4!==0).map((q,i)=>[q.id,{completed:i%4!==0,correct:i%5===0?false:true}]));
const order=questions.filter((_,i)=>i%13===0).map(q=>q.id);
const queue=questions.filter((_,i)=>i%11===0).map(q=>q.id);
test('A5-081 booklet filters match frozen baseline across discipline, pin, random order, duplicate IDs',()=>{
 for(const filter of ['all','wrong','completed','unanswered','unknown'])for(const random of [false,true])for(const discipline of [undefined,'all','Anatomy'])for(const pinned of [undefined,'Q20','Q999999'])for(const position of [-3,0,50,20000,'45']){
  const state={booklet:entries,filter,bookletRandom:random,bookletRandomOrder:order,bookletQueue:queue,bookletDiscipline:discipline,bookletFeedbackId:pinned,position};
  assert.deepEqual(norm(candidate(questions,state)),norm(baseline(questions,state)),JSON.stringify({filter,random,discipline,pinned,position}));
 }
});
test('A5-081 synthetic selection scan benchmark',()=>{
 for(const [filter,random] of [['all',false],['unanswered',false],['wrong',true],['completed',true]]){
  const state={booklet:entries,filter,bookletRandom:random,bookletRandomOrder:order,bookletQueue:queue,bookletDiscipline:'Anatomy',bookletViewId:'Q4',position:3};
  const a=norm(baseline(questions,state)),b=norm(candidate(questions,state));assert.deepEqual(a,b);
  console.log(JSON.stringify({label:'A5-081 booklet selection',filter,random,baselineMedianMs:median(()=>baseline(questions,state)),candidateMedianMs:median(()=>candidate(questions,state)),bankQuestions:questions.length}));
 }
});
