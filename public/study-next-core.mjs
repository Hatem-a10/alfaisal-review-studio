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

// Opt-in schedule for released REN lessons. Never modify existing dates or completion evidence.
const renalDateValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
const renalDayOf=stamp=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp))}catch{return null}};
export function renalPlanPreview(items,records,{events=[],group,section,date,minute=1440,minutes=90,tasks=[],blockedDates=[]}={}){
 const validGroup=['M1','M2','F1','F2'].includes(group);
 const assigned=e=>validGroup&&Array.isArray(e.studentGroups)&&e.studentGroups.includes(group)&&(!e.studentSection||e.studentSection===section);
 const final=events.filter(e=>e.course==='REN'&&e.kind==='assessment'&&/\bfinal\b/i.test(e.title)&&assigned(e)&&renalDateValid(e.date)).map(e=>e.date).sort()[0];
 const ospe=events.filter(e=>e.course==='REN'&&e.kind==='assessment'&&/\bospe\b/i.test(e.title)&&assigned(e)&&renalDateValid(e.date)).map(e=>e.date).sort()[0];
 const plans=[],unplaced=[],notReleased=[];
 if(!validGroup||!renalDateValid(date)||!final||final<=date||!Number.isFinite(minutes)||minutes<1||minutes>720)return {plans,unplaced,notReleased,final,ospe,error:'Select a verified class group and an available study budget before the Renal final.'};
 const deadline=ospe&&ospe<final?ospe:final,used=new Map(),cost=[40,30,20],blocked=new Set(blockedDates);
 for(const t of tasks)if(!t.done&&renalDateValid(t.date)&&[0,1,2].includes(t.p))used.set(t.date,(used.get(t.date)||0)+cost[t.p]);
 const releases=new Map();
 for(const e of events)if(e.course==='REN'&&['anatomy','physiology'].includes(e.kind)&&assigned(e)&&renalDateValid(e.date)&&/^[AP]\d+$/.test(e.title)&&Number.isFinite(e.end)&&(e.date<date||e.date===date&&e.end<=minute)){
  const id='REN-'+e.title;
  if(!releases.has(id)||e.date<releases.get(id))releases.set(id,e.date);
 }
 for(const item of items.filter(i=>i.course==='REN').slice().sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}))){
  const record=records[item.id]||{},old=record.dates??item.dates??[];
  if(!Array.isArray(old)||old.length||[0,1,2].every(p=>record.done?.[p]))continue;
  if(!releases.has(item.id)){notReleased.push(item.id);continue}
  const days=[],reserved=[];let previous=null,failed=false;
  for(let p=0;p<3;p++){
   if(record.done?.[p]){const completed=renalDayOf(record.done[p]);if(!renalDateValid(completed)){failed=true;break}days[p]=completed;previous=completed;continue}
   let candidate=previous?[date,dateOffset(previous,p===1?1:2)].sort().at(-1):date;
   while(candidate<deadline&&(blocked.has(candidate)||(used.get(candidate)||0)+cost[p]>minutes))candidate=dateOffset(candidate,1);
   if(candidate>=deadline){failed=true;break}
   days[p]=candidate;previous=candidate;used.set(candidate,(used.get(candidate)||0)+cost[p]);reserved.push([candidate,cost[p]]);
  }
  if(failed){for(const [day,amount] of reserved)used.set(day,used.get(day)-amount);unplaced.push(item.id);continue}
  plans.push({id:item.id,title:item.title,dates:days});
 }
 return {plans,unplaced,notReleased,final,ospe};
}
