'use strict';
const HubDomain=(()=>{
 const numeric=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;
 function grades(rows,target=65){
  target=numeric(target);
  const invalid={valid:false,error:'Enter valid weights, earned marks, positive totals and a target from 0 to 100.'};
  if(!Array.isArray(rows)||!Number.isFinite(target)||target<0||target>100)return invalid;
  let contribution=0,completedWeight=0,remaining=0,totalWeight=0;const seen=new Set();
  for(const r of rows){
   if(!r||typeof r!=='object'||(r.id&&seen.has(r.id)))return {valid:false,error:'Duplicate or invalid assessment row.'};
   if(r.id)seen.add(r.id);
   const w=numeric(r.weight),max=numeric(r.total),earned=numeric(r.earned);
   if(!Number.isFinite(w)||w<0||!Number.isFinite(max)||max<=0||r.completed&&(!Number.isFinite(earned)||earned<0||earned>max))return invalid;
   totalWeight+=w;if(r.completed){completedWeight+=w;contribution+=w*earned/max}else remaining+=w;
  }
  const configured=Math.abs(totalWeight-100)<.00001,max=contribution+remaining,need=Math.max(0,target-contribution),possible=max+1e-9>=target;
  return {valid:true,configured,totalWeight,contribution,average:completedWeight?contribution/completedWeight*100:null,max:configured?max:null,possible:configured?possible:null,requiredPercent:configured?(remaining?need/remaining*100:need?Infinity:0):null,loss:configured?Math.max(0,max-target):null,exams:rows.filter(r=>!r.completed).map(r=>{
   const w=numeric(r.weight),n=numeric(r.questions);
   return {id:r.id,requiredRaw:configured&&w>0?Math.max(0,target-(max-w))/w*numeric(r.total):null,wrong:configured&&possible&&r.equalMarks&&Number.isSafeInteger(n)&&n>0&&w>0?Math.min(n,Math.floor(Math.max(0,max-target)/w*n+1e-9)):null};
  })};
 }
 function countdown(event,now=Date.now()){
  if(typeof event?.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||!Number.isFinite(Date.parse(event.date+'T00:00:00+03:00'))||new Date(event.date+'T12:00:00Z').toISOString().slice(0,10)!==event.date||!Number.isFinite(now))return {known:false,invalid:true};
  const detail=typeof event.detail==='string'?event.detail:'',match=detail.match(/\b(\d{1,2}):(\d{2})(?!\d)\s*(am|pm)?\b/i);
  let time='08:00';const assumed=!match;
  if(match){let h=Number(match[1]);const m=Number(match[2]),period=match[3]?.toLowerCase();if(m>59||h>23||period&&(h<1||h>12))return {known:false,invalid:true};if(period)h=h%12+(period==='pm'?12:0);time=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
  const startAt=Date.parse(event.date+'T'+time+':00+03:00'),delta=startAt-now,n=Math.floor(Math.abs(delta)/1000);
  return {known:true,assumed,time,startAt,past:delta<0,seconds:n,text:[Math.floor(n/86400),Math.floor(n/3600)%24,Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(' : ')};
 }
 function resume(topics,scores,last){const i=scores.findIndex(s=>!s.complete);if(i>=0)return i;const found=topics.findIndex(t=>t.id===last);return found<0?0:found}
 function attention(session,after=-1){const pending=session.questions.map((q,i)=>i).filter(i=>session.graded[i]?session.answers[i]!==session.questions[i].answer:!Number.isInteger(session.answers[i]));return pending.find(i=>i>after)??pending[0]??-1}
 function reviewAttention(session,seen=[],includeOptional=false){const eligible=(q)=>includeOptional||!q.duplicateOf,wrong=session.questions.map((q,i)=>i).filter(i=>eligible(session.questions[i])&&session.graded[i]&&session.answers[i]!==session.questions[i].answer);if(wrong.length)return wrong.find(i=>!seen.includes(i))??-1;return session.questions.findIndex((q,i)=>eligible(q)&&!session.graded[i]&&!Number.isInteger(session.answers[i]))}
 function lessonIdsForDay(tasks,date,overdue=false){return [...new Set(tasks.filter(t=>!t.done&&typeof t.date==='string'&&(overdue?t.date<date:t.date===date)).map(t=>t.x.id))]}
 let timeFormatter;
 function timeLabel(now=new Date()){return (timeFormatter??=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})).format(now)}
 function jumpDirection(rect,viewport){return rect.top+rect.height/2<viewport/2?'up':'down'}
 function nextSunday(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+(7-d.getUTCDay()||7));return d.toISOString().slice(0,10)}
 function countdownCategory(event){const text=[event.kind,event.type,event.title].filter(Boolean).join(' ');if(/ospe|practical/i.test(text))return 'ospe';if(/course start|begins/i.test(text))return 'starts';if(/tbl/i.test(text))return 'tbls';if(/exam|final|midterm/i.test(text))return 'exams';return 'other'}
 function filterCountdowns(events,filter='all'){return events.filter(e=>{const c=countdownCategory(e);return filter==='all'||c===filter})}
 function activity(records){
  const days={},formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}),seen=new Set();
  const array=v=>Array.isArray(v)?v:[],stamp=at=>typeof at==='string'?Date.parse(at):NaN;
  function put(at,key,kind,n=1){const time=stamp(at);if(!Number.isFinite(time)||!Number.isFinite(n)||n<=0||seen.has(key))return;seen.add(key);const d=formatter.format(new Date(time));days[d]??={reviews:0,practice:0,minutes:0};days[d][kind]+=n}
  for(const[id,r]of Object.entries(records||{})){if(!r||typeof r!=='object')continue;for(const[p,at]of Object.entries(r.done||{}))put(at,id+':r'+p,'reviews');
   const attempts=array(r.learning?.attempts).filter(a=>a&&Number.isFinite(stamp(a.at))),attemptDates=new Set(attempts.map(a=>a.at));
   for(const a of attempts)put(a.at,id+':q'+a.q+':'+a.at,'practice');
   for(const a of array(r.mcqs))if(a&&!attemptDates.has(a.createdAt))put(a.createdAt,id+':m'+(a.id||a.createdAt),'practice');
   for(const a of array(r.sessions))if(a)put(a.endedAt,id+':s'+(a.id||a.startedAt),'minutes',numeric(a.seconds)/60);
  }return days;
 }
 const active=(e,date,minute)=>!!e&&e.date===date&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&Number.isFinite(minute)&&e.start<=minute&&minute<e.end;
 return {grades,countdown,resume,attention,reviewAttention,lessonIdsForDay,timeLabel,jumpDirection,nextSunday,countdownCategory,filterCountdowns,activity,active};
})();
