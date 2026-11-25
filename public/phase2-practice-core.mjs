const clone=x=>JSON.parse(JSON.stringify(x));
const historyStamp=v=>typeof v==='number'&&Number.isFinite(v)?v:Date.parse(v)||0;
// Small histories use native sort directly; larger histories parse each timestamp once.
function sortMockHistory(mocks){if(mocks.length<16)return mocks.sort((a,b)=>historyStamp(a.createdAt)-historyStamp(b.createdAt));return mocks.map(mock=>({mock,stamp:historyStamp(mock.createdAt)})).sort((a,b)=>a.stamp-b.stamp).map(entry=>entry.mock)}
import {deduplicateQuestions} from './phase2-question-quality.mjs';
export {deduplicateQuestions,duplicateKey,nearDuplicate} from './phase2-question-quality.mjs';
export function analytics(booklet,mocks,questions,lectures=[]){const rows={},lectureGroups=new Map();function lectureGroup(id){if(!lectureGroups.has(id))lectureGroups.set(id,lectures.find(x=>x.id===id)?.group||id.match(/^CVP-([A-Z]+)/)?.[1]);return lectureGroups.get(id)}function add(q,correct){if(typeof correct!=='boolean')return;const ids=[...new Set(q.lectureIds?.length?q.lectureIds:[])];const groups=ids.map(lectureGroup).filter(Boolean).map(x=>'Discipline: '+x);if(!ids.length&&q.group)groups.push('Discipline: '+q.group);const keys=[...ids,...new Set(groups)];for(const k of keys){const r=rows[k]??={correct:0,total:0};r.total++;r.correct+=Number(correct)}}for(const q of questions){const a=bookletEntry(q,booklet);if(a?.completed)add(q,a.correct)}const counted=new Set();for(const m of mocks||[])for(const s of m.attempts||[m.snapshot]){if(!s?.finishedAt||s.excludedLowScore||!Array.isArray(s.questions)||s.id&&counted.has(s.id))continue;if(s.id)counted.add(s.id);for(let i=0;i<s.questions.length;i++){const a=s.answers?.[i],q=s.questions[i];if(q&&Number.isInteger(q.answer)&&Number.isInteger(a)&&a>=0&&a<q.options?.length&&q.answer>=0&&q.answer<q.options.length)add(q,(q.acceptedAnswers||[q.answer]).includes(a))}}return Object.entries(rows).map(([id,v])=>({id,...v,accuracy:v.correct/v.total})).sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total||a.id.localeCompare(b.id))}
export function rankWeakQuestions(pool,weak,wrong=[]){const missed=new Set(wrong.map(x=>x.question?.id||x.id)),weights=new Map(weak.filter(x=>!x.id.startsWith('Discipline: ')).map(x=>[x.id,1-x.accuracy]));return deduplicateQuestions(pool).map((q,i)=>({q,i,score:(q.lectureIds||[]).reduce((n,id)=>Math.max(n,weights.get(id)||0),0)+(missed.has(q.id)?1:0)})).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.q)}
export function coverageAudit(lectures,pool){const covered=new Set(pool.flatMap(q=>q.lectureIds||[]));return lectures.filter(x=>!covered.has(x.id)).map(x=>({id:x.id,title:x.title||''})).sort((a,b)=>a.id.localeCompare(b.id))}
export function mockName(value){const date=new Date(value);if(!Number.isFinite(+date))return 'Mock · date unavailable';return 'Mock '+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(date).replace(' at ', ', ')}
export function updateSnapshot(list,exam,admin=false){const next=clone(list||[]),parent=exam.parentMockId||exam.id,i=next.findIndex(x=>x.id===parent);const removed=[];if(i<0&&!admin)while(next.length>=5)removed.push(next.shift());const j=next.findIndex(x=>x.id===parent),prior=j>=0?next[j]:null,attempts=prior?.attempts|| (prior?.snapshot?[prior.snapshot]:[]),idx=attempts.findIndex(x=>x.id===exam.id);if(idx<0)attempts.push(clone(exam));else attempts[idx]=clone(exam);const item={id:parent,name:prior?.name||mockName(exam.startedAt||Date.now()),createdAt:prior?.createdAt||exam.startedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),snapshot:clone(exam),attempts};if(j<0)next.push(item);else next[j]=item;return {list:next,removed}}
export function mergeBookletAnnotations(a={},b={}){
 const out=Object.create(null);
 for(const source of [a,b])for(const [id,row] of Object.entries(source||{})){
  if(!id||id.length>240||['__proto__','constructor','prototype'].includes(id)||!row||typeof row!=='object')continue;
  for(const [field,at,valid] of [['flagged','flagAt',v=>typeof v==='boolean'],['note','noteAt',v=>typeof v==='string'&&v.length<=5000]]){
   const time=Date.parse(row[at]);if(!valid(row[field])||!Number.isFinite(time))continue;
   const target=out[id]??={};if(!target[at]||time>=Date.parse(target[at])){target[field]=row[field];target[at]=row[at];}
  }
 }
 return out;
}
export function bookletAnnotation(q,annotations={}){
 const ids=[...Object.keys(q.legacyChoices||{}),q.id];
 return ids.reduce((a,id)=>mergeBookletAnnotations({[q.id]:a},{[q.id]:annotations[id]})[q.id]||{},{});
}
export function mergePractice(a={},b={}){const stamp=v=>typeof v==='number'&&Number.isFinite(v)?v:Date.parse(v)||0,newer=(x,y)=>!x?y:!y?x:stamp(y.at||y.updatedAt||y.createdAt)>stamp(x.at||x.updatedAt||x.createdAt)?y:x;const booklet={...a.booklet};for(const [id,v] of Object.entries(b.booklet||{}))booklet[id]=newer(booklet[id],v);const deleted={...a.deletedMocks};for(const [id,t] of Object.entries(b.deletedMocks||{}))if((Date.parse(t)||0)>(Date.parse(deleted[id])||0))deleted[id]=t;const mocks=new Map();for(const m of [...(a.mocks||[]),...(b.mocks||[])]){const old=mocks.get(m.id);if(!old){mocks.set(m.id,clone(m));continue}const attempts=new Map();for(const run of [...(old.attempts||[old.snapshot]),...(m.attempts||[m.snapshot])]){if(!run)continue;const identity=run.id||'legacy:'+JSON.stringify([run.startedAt,run.finishedAt,run.questions?.map(q=>q.id),run.answers]),prev=attempts.get(identity),runStamp=x=>stamp(x?.finishedAt||x?.updatedAt||x?.startedAt);if(!prev||!!run.finishedAt&&!prev.finishedAt||!!run.finishedAt===!!prev.finishedAt&&runStamp(run)>runStamp(prev))attempts.set(identity,run)}const latest=newer(old,m),canonical=latest.snapshot?.id?attempts.get(latest.snapshot.id):null;mocks.set(m.id,{...latest,snapshot:canonical||latest.snapshot,attempts:[...attempts.values()]})}const nav=(Date.parse(a.navigationAt)||0)>(Date.parse(b.navigationAt)||0)?a:b;return {...a,...b,filter:nav.filter,position:nav.position,bookletIncludeMCQ:nav.bookletIncludeMCQ!==false,bookletDiscipline:nav.bookletDiscipline||'all',bookletRandom:!!nav.bookletRandom,bookletRandomOrder:nav.bookletRandomOrder||[],bookletIncludeSAQ:nav.bookletIncludeSAQ!==false,bookletIncludeOSPE:nav.bookletIncludeOSPE!==false,bookletFeedbackId:nav.bookletFeedbackId||null,bookletQueue:nav.bookletQueue||[],bookletHistory:nav.bookletHistory||[],bookletForward:nav.bookletForward||[],bookletViewId:nav.bookletViewId||null,navigationAt:nav.navigationAt,renalNavigation:newer(a.renalNavigation,b.renalNavigation),molNavigation:newer(a.molNavigation,b.molNavigation),booklet,...(a.bookletAnnotations||b.bookletAnnotations?{bookletAnnotations:mergeBookletAnnotations(a.bookletAnnotations,b.bookletAnnotations)}:{}),deletedMocks:deleted,mocks:sortMockHistory([...mocks.values()].filter(m=>!deleted[m.id]))}}

// Project old duplicate attempts onto their shared question without rewriting account data.
export function bookletEntry(q,entries={}){
 const current=entries[q.id];
 const aliases=Object.entries(q.legacyChoices||{}).filter(([id])=>entries[id]);
 const project=(entry,answer)=>{
  if(!q.choiceRevision||entry.choiceRevision===q.choiceRevision)return {...entry,answer};
  const priorChoice=q.previousOptions?.[answer];
  const options=q.options.map(option=>option.trim().toLowerCase());
  const previous=priorChoice?.trim().toLowerCase();
  const index=previous&&options.indexOf(previous)===options.lastIndexOf(previous)?options.indexOf(previous):-1;
  return {...entry,answer:index>=0?index:undefined,priorChoice,previousResult:entry.completed===true};
 };
 if(!aliases.length)return current&&q.choiceRevision?project(current,current.answer):current;
 const candidates=aliases.map(([id,order])=>{
  const entry=entries[id],answer=order[entry.answer];
  return project(entry,Number.isInteger(answer)&&answer>=0?answer:undefined);
 });
 if(current)candidates.unshift(q.choiceRevision?project(current,current.answer):current);
 const rank=entry=>entry.completed&&entry.correct!==false?2:entry.completed?1:0;
 return candidates.reduce((best,entry)=>rank(entry)>rank(best)||rank(entry)===rank(best)&&historyStamp(entry.at)>historyStamp(best.at)?entry:best);
}

const bookletAliases=new WeakMap();
export function resolveBookletNavigation(questions,state){
 let aliases=bookletAliases.get(questions);
 if(!aliases){
  aliases=new Map(questions.flatMap(q=>Object.keys(q.legacyChoices||{}).map(id=>[id,q.id])));
  bookletAliases.set(questions,aliases);
 }
 if(!aliases.size)return state;
 const canonical=id=>aliases.get(id)||id;
 const next={...state};
 for(const key of ['bookletViewId','bookletFeedbackId'])if(next[key])next[key]=canonical(next[key]);
 for(const key of ['bookletRandomOrder','bookletQueue','bookletHistory','bookletForward']){
  if(!next[key]?.length)continue;
  const mapped=next[key].map(canonical);
  next[key]=key==='bookletQueue'||key==='bookletRandomOrder'?[...new Set(mapped)]:mapped.filter((id,i)=>i===0||id!==mapped[i-1]);
 }
 return next;
}

const matchesBookletDiscipline=(q,discipline)=>!discipline||discipline==='all'||q.discipline===discipline||q.disciplines?.includes(discipline);
export function bookletTypeAllowed(q,state){return (q.type==='mcq'?state.bookletIncludeMCQ!==false:(q.type==='ospe'||/^cvp19-ospe-/.test(q.id)?state.bookletIncludeOSPE!==false:state.bookletIncludeSAQ!==false))}
export function randomizeBooklet(questions,state,rng=Math.random){const ids=questions.map(q=>q.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}state.bookletRandomOrder=ids;return state}

export function selectBooklet(questions,state){const entries=state.booklet||{},filter=state.filter||'all',discipline=state.bookletDiscipline,pinnedId=state.bookletFeedbackId||state.bookletViewId,originalRank=state.bookletRandom?new Map():null;let pinned,list=[];questions.forEach((q,i)=>{if(originalRank)originalRank.set(q.id,i);if(pinnedId&&!pinned&&q.id===pinnedId)pinned=q;if(!bookletTypeAllowed(q,state)||!matchesBookletDiscipline(q,discipline))return;const entry=bookletEntry(q,entries),pending=!entry?.completed||entry?.correct===false;if(filter==='all'||(filter==='flagged'?bookletAnnotation(q,state.bookletAnnotations).flagged===true:filter==='noted'?!!bookletAnnotation(q,state.bookletAnnotations).note?.trim():filter==='wrong'?entry?.correct===false:filter==='completed'?!!entry?.completed&&entry?.correct!==false:pending))list.push(q)});if(state.bookletRandom){const rank=new Map((state.bookletRandomOrder||[]).map((id,i)=>[id,i]));list.sort((a,b)=>(rank.get(a.id)??(rank.size+originalRank.get(a.id)))-(rank.get(b.id)??(rank.size+originalRank.get(b.id))))}if(filter==='unanswered'||filter==='wrong'){const rank=new Map((state.bookletQueue||[]).map((id,i)=>[id,i]));list=list.map((q,i)=>({q,i})).sort((a,b)=>(rank.get(a.q.id)??100000+a.i)-(rank.get(b.q.id)??100000+b.i)).map(x=>x.q)}const position=Math.min(Math.max(Math.trunc(Number(state.position)||0),0),Math.max(list.length-1,0));return {list,position,question:(pinned&&bookletTypeAllowed(pinned,state)&&matchesBookletDiscipline(pinned,discipline)?pinned:null)||list[position]||null}}
export function advanceBooklet(questions,state,rng=Math.random){const {list,question:q,position}=selectBooklet(questions,state);if(!q)return state;const entry=bookletEntry(q,state.booklet);if(state.filter==='unanswered'||state.filter==='wrong'){let queue=list.map(x=>x.id).filter(id=>id!==q.id);if(entry?.correct===false){const index=queue.length?1+Math.floor(rng()*queue.length):0;queue.splice(index,0,q.id)}else if(!entry?.completed)queue.push(q.id);state.bookletQueue=queue;state.position=0}else{state.position=Math.max(0,Math.min(list.length-1,Math.max(0,list.findIndex(x=>x.id===q.id))+1));if(entry?.correct===false){const queue=questions.filter(v=>{const progress=bookletEntry(v,state.booklet);return !progress?.completed||progress.correct===false}).map(v=>v.id).filter(id=>id!==q.id);queue.splice(queue.length?1+Math.floor(rng()*queue.length):0,0,q.id);state.bookletQueue=queue}}state.bookletHistory=[...(state.bookletHistory||[]),q.id].slice(-1000);state.bookletViewId=state.bookletForward?.pop()||null;delete state.bookletFeedbackId;return state}

export function enforceHistoryLimit(data,admin,at=new Date().toISOString()){if(admin!==false||(data.mocks||[]).length<=5)return data;const sorted=sortMockHistory([...data.mocks]),removed=sorted.slice(0,-5),deletedMocks={...data.deletedMocks};for(const mock of removed)deletedMocks[mock.id]=at;return {...data,mocks:sorted.slice(-5),deletedMocks}}

export function previousBooklet(questions,state){const current=selectBooklet(questions,state).question,prior=state.bookletHistory?.pop();if(prior){state.bookletForward??=[];if(current)state.bookletForward.push(current.id);state.bookletViewId=prior;delete state.bookletFeedbackId}else{delete state.bookletFeedbackId;delete state.bookletViewId;state.position=Math.max(0,(state.position||0)-1)}return state}
