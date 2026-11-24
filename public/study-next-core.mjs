const dateOffset=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);

export function catchupPreview(tasks,{date,minutes,events=[],targets=new Map()}){
 const estimates=[25,20,15];
 const due=tasks.filter(task=>task.date&&task.date<=date&&!task.done);
 const later=new Map(tasks.filter(task=>task.date>date&&!task.done).map(task=>[task.date,0]));
 for(const task of tasks)if(task.date>date&&!task.done)later.set(task.date,later.get(task.date)+estimates[task.p]);
 const pending=due.sort((a,b)=>a.p-b.p||String(targets.get(a.x.id)||'9999').localeCompare(targets.get(b.x.id)||'9999')||a.date.localeCompare(b.date));
 const selected=[],moved=[],unplaced=[],blocked=new Set(),schedule=new Map(tasks.map(t=>[t.x.id+':'+t.p,t.date]));
 let used=0;
 for(const task of pending){
  const {x,p}=task,estimate=estimates[p];
  if(blocked.has(x.id)){unplaced.push(task);continue;}
  if(used+estimate<=minutes&&!moved.some(m=>m.id===x.id)){selected.push({...task,estimate});used+=estimate;continue;}
  const previous=schedule.get(x.id+':'+(p-1)),next=schedule.get(x.id+':'+(p+1)),deadline=targets.get(x.id);
  let destination;
  for(let offset=1;offset<=14;offset++){
   const day=dateOffset(date,offset);
   if(previous&&day<previous||next&&day>next||deadline&&day>=deadline)continue;
   if(events.some(e=>e.date===day&&/final|exam|break|holiday/i.test(e.kind+' '+e.type)))continue;
   if((later.get(day)||0)+estimate<=Math.min(90,Math.max(25,minutes))){destination=day;break;}
  }
  if(!destination){unplaced.push(task);blocked.add(x.id);continue;}
  moved.push({id:x.id,title:x.title,pass:p,from:task.date,to:destination});
  schedule.set(x.id+':'+p,destination);
  later.set(destination,(later.get(destination)||0)+estimate);
 }
 return {selected,moved,unplaced,used};
}

const stem=q=>String(q?.question||q?.stem||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const usable=q=>Number.isInteger(q?.answer)&&q.answer>=0&&q.answer<q.options?.length;
export function revisionQueue(run,questions,topics){
 const mapped=new Map(),byStem=new Map();
 for(const topic of topics)for(const q of topic.questions){
  if(!mapped.has(q.id))mapped.set(q.id,topic);
  if(stem(q)&&!byStem.has(stem(q)))byStem.set(stem(q),topic);
 }
 const frozen=new Map((run.receipt?.questions||[]).map(q=>[q.id,q]));
 const excluded=new Set(questions.map(stem)),used=new Set();
 return questions.flatMap((q,index)=>{
  const receipt=frozen.get(q.id),key=receipt?receipt.key:q.answer;
  const selected=receipt?receipt.selected:run.answers?.[run.ids?q.id:index];
  if(q.type==='short'||!Number.isInteger(key)||!Number.isInteger(selected)||selected===key)return [];
  const topic=mapped.get(q.id)||byStem.get(stem(q))||topics.find(t=>t.id===q.concept&&q.lectureIds?.includes(t.lectureId));
  const next=topic?.questions.find(v=>usable(v)&&!excluded.has(stem(v))&&!used.has(v.id));
  if(next)used.add(next.id);
  return [{id:q.id,number:index+1,topic,next}];
 });
}

export function topicCoverage(questions,lookup,bank){
 const count=new Map(),supply=new Map();
 for(const q of bank){const id=lookup(q);if(id)supply.set(id,(supply.get(id)||0)+1);}
 for(const q of questions){const id=lookup(q);count.set(id,(count.get(id)||0)+1);}
 return [...count].map(([topic,total])=>({topic,total,available:supply.get(topic)||0})).sort((a,b)=>b.total-a.total);
}
