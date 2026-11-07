'use client';
import {useEffect,useState} from 'react';
import {gradeForecast,type GradeRow,type Grades} from '../../lib/student-grades';
import type {AcademicEvent,Group} from '../../lib/student-profile';
import styles from './student.module.css';

type PersonalEvent=AcademicEvent & {id:string};
const emptyEvent={title:'',date:'',time:'',kind:'exam' as AcademicEvent['kind']};

export function AcademicTools({group,accountKey}:{group:Group;accountKey:string}) {
 const courses=[...new Set(group.lectures.map(lecture=>lecture.course))];
 const [course,setCourse]=useState(courses[0]||'');
 const [revision,setRevision]=useState(0);
 const [grades,setGrades]=useState<Grades>({});
 const [target,setTarget]=useState(65);
 const [ready,setReady]=useState(false);
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 const [now,setNow]=useState<number|null>(null);
 const [opened,setOpened]=useState(false);
 const [filter,setFilter]=useState('all');
 const [personal,setPersonal]=useState<PersonalEvent[]>([]);
 const [eventDraft,setEventDraft]=useState<AcademicEvent>(emptyEvent);
 const [eventId,setEventId]=useState<string|undefined>();
 const [eventStatus,setEventStatus]=useState('');
 const [eventBusy,setEventBusy]=useState(false);

 useEffect(()=>{
  if (!opened) return;
  setNow(Date.now());
  const controller=new AbortController();
  fetch('/api/student-countdowns',{headers:{'X-Review-Account':accountKey},signal:controller.signal})
   .then(async response=>{
    const data=await response.json() as {events:PersonalEvent[];error?:string};
    if (!response.ok) throw Error(data.error||'Personal countdowns are unavailable.');
    setPersonal(data.events);
   }).catch(error=>{if(!controller.signal.aborted)setEventStatus(error.message)});
  const interval=setInterval(()=>setNow(Date.now()),1000);
  return ()=>{clearInterval(interval);controller.abort()};
 },[opened,accountKey]);

 async function load() {
  setBusy(true);
  try {
   const response=await fetch('/api/student-grades',{headers:{'X-Review-Account':accountKey}});
   const data=await response.json() as {grades:Grades;revision:number;error?:string};
   if (!response.ok) throw Error(data.error||'Grades are unavailable.');
   setGrades(data.grades);setRevision(data.revision);setReady(true);setStatus('');
  } catch(error) {setStatus(error instanceof Error?error.message:'Could not load grades.')}
  finally {setBusy(false)}
 }

 async function save() {
  setBusy(true);
  try {
   const response=await fetch('/api/student-grades',{method:'PUT',
    headers:{'Content-Type':'application/json','X-Review-Account':accountKey},body:JSON.stringify({grades,revision})});
   const data=await response.json() as {error?:string;revision:number};
   if (!response.ok) throw Error(data.error||'Could not save grades.');
   setRevision(data.revision);
   setStatus('Grades saved to your account.');
  } catch(error) {setStatus(error instanceof Error?error.message:'Could not save grades.')}
  finally {setBusy(false)}
 }

 const rows=Object.hasOwn(grades,course)?grades[course]:[];
 const setRows=(next:GradeRow[])=>setGrades(previous=>({...previous,[course]:next}));
 const edit=(index:number,change:Partial<GradeRow>)=>setRows(rows.map((row,i)=>i===index?{...row,...change}:row));
 const forecast=gradeForecast(rows,target);
 async function manageEvent(action:'save'|'delete',id?:string) {
  setEventBusy(true);setEventStatus('');
  try {
   const response=await fetch('/api/student-countdowns',{method:'POST',
    headers:{'Content-Type':'application/json','X-Review-Account':accountKey},
    body:JSON.stringify({action,id,event:{...eventDraft,title:eventDraft.title.trim(),time:eventDraft.time||undefined}})});
   const data=await response.json() as {error?:string;event:PersonalEvent};
   if (!response.ok) throw Error(data.error||'Could not save the countdown.');
   setPersonal(events=>action==='delete'?events.filter(event=>event.id!==id):[...events.filter(event=>event.id!==data.event.id),data.event]);
   if (action==='save'||id===eventId){setEventDraft(emptyEvent);setEventId(undefined);}
   setEventStatus(action==='delete'?'Countdown removed.':'Countdown saved.');
  } catch(error){setEventStatus(error instanceof Error?error.message:'Countdown request failed.');}
  finally{setEventBusy(false)}
 }
 const official=(group.events||[]).filter(event=>['exam','tbl'].includes(event.kind));
 const events=[...official,...personal]
  .map(event=>({...event,at:Date.parse(event.date+'T'+(event.time||'08:00')+':00+03:00')}))
  .filter(event=>(now===null||event.at>=now) && (filter==='all'||filter===event.kind))
  .sort((a,b)=>a.at-b.at);

 return <>
  <details onToggle={event=>setOpened(event.currentTarget.open)}>
   <summary>Exam &amp; TBL countdowns</summary>
   <label>Assessment type<select value={filter} onChange={event=>setFilter(event.target.value)}>
    <option value="all">All events</option><option value="exam">Exams</option><option value="tbl">TBLs</option><option value="class">Other personal events</option>
   </select></label>
   {events.length?<ul>{events.map((event,index)=><li key={index}><strong>{event.title}</strong>
    <p>{event.date} · {event.time||'08:00 (assumed)'}{now!==null?' · '+countdown(event.at-now):''}</p>
   </li>)}</ul>:<p>No upcoming configured assessments.</p>}
   <details><summary>Manage personal countdowns</summary>
    <ul>{personal.map(event=><li key={event.id}>{event.title} · {event.date}
     <button disabled={eventBusy} onClick={()=>{setEventId(event.id);setEventDraft(event)}}>Edit</button>
     <button disabled={eventBusy} onClick={()=>{if(confirm('Remove this personal countdown?'))manageEvent('delete',event.id)}}>Remove</button>
    </li>)}</ul>
    <label>Title<input maxLength={160} value={eventDraft.title} onChange={event=>setEventDraft({...eventDraft,title:event.target.value})}/></label>
    <label>Date<input type="date" value={eventDraft.date} onChange={event=>setEventDraft({...eventDraft,date:event.target.value})}/></label>
    <label>Time (Riyadh, optional)<input type="time" value={eventDraft.time||''} onChange={event=>setEventDraft({...eventDraft,time:event.target.value})}/></label>
    <label>Type<select value={eventDraft.kind} onChange={event=>setEventDraft({...eventDraft,kind:event.target.value as AcademicEvent['kind']})}>
     <option value="exam">Exam</option><option value="tbl">TBL</option><option value="class">Other</option>
    </select></label>
    <button disabled={eventBusy||!eventDraft.title.trim()||!eventDraft.date} onClick={()=>manageEvent('save',eventId)}>
     {eventId?'Save changes':'Add countdown'}
    </button>
   </details>
   {eventStatus&&<p role="status">{eventStatus}</p>}
  </details>
  {!!courses.length&&<details onToggle={event=>{if(event.currentTarget.open&&!ready&&!busy)load()}}>
   <summary>Course grade calculator</summary>
   <label>Course<select value={course} onChange={event=>setCourse(event.target.value)}>
    {courses.map(course=><option key={course}>{course}</option>)}
   </select></label>
   <label>Target<select value={target} onChange={event=>setTarget(Number(event.target.value))}>
    {[65,75,85,90].map(target=><option key={target} value={target}>{target}%</option>)}
   </select></label>
   {ready&&<>
    {rows.map((row,index)=><fieldset key={index} disabled={busy}><legend>Assessment {index+1}</legend>
     <label>Name<input value={row.name} onChange={event=>edit(index,{name:event.target.value})}/></label>
     <label>Weight (%)<input type="number" min={0} max={100} step="any" value={row.weight} onChange={event=>edit(index,{weight:Number(event.target.value)})}/></label>
     <label>Maximum points<input type="number" min={1} step="any" value={row.total} onChange={event=>edit(index,{total:Number(event.target.value)})}/></label>
     <label>Earned points (blank if upcoming)<input type="number" min={0} max={row.total} step="any" value={row.earned??''}
      onChange={event=>edit(index,{earned:event.target.value===''?null:Number(event.target.value)})}/></label>
     {row.earned===null&&<>
      <label>Question count (optional)<input type="number" min={1} max={10000} value={row.questions??''}
       onChange={event=>edit(index,{questions:event.target.value===''?undefined:Number(event.target.value)})}/></label>
      <label><input type="checkbox" checked={!!row.equalMarks} onChange={event=>edit(index,{equalMarks:event.target.checked})}/>
       All questions carry equal marks</label>
      {forecast.wrongAllowed[index]!==null&&<p>You can miss {forecast.wrongAllowed[index]} questions here if you earn full marks on all other upcoming assessments.</p>}
     </>}
     <button onClick={()=>setRows(rows.filter((_,i)=>index!==i))}>Remove assessment</button>
    </fieldset>)}
    <div className={styles.row}>
     <button disabled={busy||rows.length>=40} onClick={()=>setRows([...rows,{name:'Assessment',weight:0,earned:null,total:100}])}>Add assessment</button>
     <button disabled={busy} onClick={save}>Save grades</button>
     <button disabled={busy} onClick={()=>{if(confirm('Reload cloud grades and discard unsaved edits?'))load()}}>Reload cloud grades</button>
    </div>
    <p>Weighted contribution {forecast.contribution.toFixed(1)}%{forecast.average!==null?' · Completed average '+forecast.average.toFixed(1)+'%':''}</p>
    {forecast.configured?<p>Maximum {forecast.maximum.toFixed(1)}% · {forecast.possible?'Target reachable':'Target out of reach'}
     {forecast.required!==null?' · Required remaining average '+forecast.required.toFixed(1)+'%':''} · Course points you can lose {forecast.room.toFixed(1)}</p>
    :<p>Assessment weights total {forecast.total.toFixed(1)}%. Enter all weights to calculate the final forecast.</p>}
   </>}
   {status&&<p role="status">{status}</p>}
  </details>}
 </>;
}

function countdown(ms:number) {
 const seconds=Math.max(0,Math.floor(ms/1000));
 return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60]
  .map(value=>String(value).padStart(2,'0')).join(' : ');
}
