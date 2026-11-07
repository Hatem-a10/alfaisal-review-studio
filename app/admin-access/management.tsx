'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {Group} from '../../lib/student-profile';

type Student = {name:string;classCode:string;groupCode:string;tblGroup?:string;labGroup?:string;createdAt:string;activeAt:string;completed:boolean;
 history:{title:string;passes:number[];completed:number[]}[]|null; questions:{attempted:number;correct:number}|null};
const stamp = (date:string) => new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'
}).format(new Date(date));

export function AdminManagement() {
 const [students,setStudents] = useState<Student[]>([]);
 const [uploads,setUploads] = useState<{id:string;name:string;lectureId:string}[]>([]);
 const [groups,setGroups] = useState<Group[]>([]);
 const [query,setQuery] = useState('');
 const [groupFilter,setGroupFilter] = useState('');
 const [sort,setSort] = useState('active');
 const [config,setConfig] = useState('');
 const [status,setStatus] = useState('');
 const [limited,setLimited] = useState(false);
 const [saving,setSaving] = useState(false);

 async function read<T=unknown>(path:string,options?:RequestInit):Promise<T> {
  const response = await fetch(path,options);
  const data = await response.json() as T & {error?:string};
  if (!response.ok) throw Error(data.error || 'Administrative access is unavailable.');
  return data;
 }

 useEffect(()=>{
  let active = true;
  Promise.all([read<{students:Student[];limited:boolean}>('/api/admin-students'),read<{groups:Group[];uploads:{id:string;name:string;lectureId:string}[]}>('/api/admin-academics')]).then(([directory,config])=>{
   if (!active) return;
   setStudents(directory.students);
   setLimited(directory.limited);
   setGroups(config.groups);
   setUploads(config.uploads);
  }).catch(error=>{if(active)setStatus(error.message)});
  return ()=>{active=false};
 },[]);

 async function save(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSaving(true);
  try {
   await read('/api/admin-academics',{method:'PUT',headers:{'Content-Type':'application/json'},body:config});
   setGroups((await read<{groups:Group[];uploads:{id:string;name:string;lectureId:string}[]}>('/api/admin-academics')).groups);
   setStatus('Group configuration saved.');
  } catch (error) {
   setStatus(error instanceof Error?error.message:'Could not save configuration.');
  } finally {
   setSaving(false);
  }
 }

 const visible = students.filter(student=>
  (!groupFilter || student.classCode+' / '+student.groupCode===groupFilter) &&
  (student.name+' '+student.classCode+' '+student.groupCode).toLowerCase().includes(query.trim().toLowerCase())
 ).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):b.activeAt.localeCompare(a.activeAt));
 const activity = (days:number)=>students.filter(student=>Date.parse(student.activeAt)>=Date.now()-days*86400000).length;

 return <main style={{maxWidth:'64rem',margin:'2rem auto',padding:'1rem',display:'grid',gap:'1.25rem'}}>
  <h1>Admin Settings</h1>
  <p><a href="/">Open Review Studio and its existing storage controls</a></p>
  <button type="button" onClick={async()=>{
   try {await read('/api/admin-session',{method:'DELETE'});location.reload()} catch(error) {setStatus((error as Error).message)}
  }}>Lock Admin Settings</button>
  <section>
   <h2>Student management</h2>
   <p>{students.length} registered{limited?' in the most recent 500 accounts':''} · Activity: {activity(1)} in 24h, {activity(7)} in 7 days, {activity(30)} in 30 days.</p>
   <p>Activity here reflects saved setup, profile changes, and review actions.</p>
   <label>Search students <input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label>Group <select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}>
    <option value="">All groups</option>{groups.map(group=>{const key=group.classCode+' / '+group.groupCode;return <option key={key}>{key}</option>})}
   </select></label>
   <label>Sort by <select value={sort} onChange={e=>setSort(e.target.value)}>
    <option value="active">Last active</option><option value="name">Name</option>
   </select></label>
   {visible.map((student,index)=><details key={student.createdAt+':'+index}>
    <summary>{student.name||'Setup started'} · {student.classCode||'Class pending'} {student.groupCode}{student.tblGroup?' · TBL '+student.tblGroup:''}{student.labGroup?' · Lab '+student.labGroup:''}</summary>
    <p>Registered {stamp(student.createdAt)} · Last active {stamp(student.activeAt)} · {student.completed?'Setup complete':'Setup in progress'}</p>
    {student.questions&&<p>{student.questions.attempted} distinct lesson questions checked · {student.questions.correct} correct on latest answers</p>}
    {student.history ? <ul>{student.history.map((lecture,i)=><li key={i}>{lecture.title} · {lecture.passes.length} historical · {lecture.completed.length} completed in Review Studio</li>)}</ul>
     : <p>Identifiable learning reports are off for this account.</p>}
   </details>)}
   {!visible.length&&<p>No matching students.</p>}
  </section>
  <section>
   <h2>Academic configuration</h2>
   <p>Add only groups and lecture assignments that you have verified.</p>
   {groups.map(group=><button type="button" key={group.classCode+'/'+group.groupCode}
    onClick={()=>setConfig(JSON.stringify(group,null,2))}>{group.classCode} · {group.groupCode}</button>)}
   {!!uploads.length&&<details><summary>Owner uploads eligible for sharing</summary><ul>{uploads.map(upload=><li key={upload.id}>
    {upload.lectureId} · {upload.name} · <code>{upload.id}</code>
   </li>)}</ul></details>}
   <form onSubmit={save} style={{display:'grid',gap:'.5rem'}}>
    <label htmlFor="groupConfiguration">Group JSON</label>
    <textarea id="groupConfiguration" rows={10} value={config} onChange={e=>setConfig(e.target.value)} required />
    <p>Use classCode, groupCode, and lectures. Each lecture needs an existing id, title, and course. Optionally include three verified review dates as reviewsOn and group events with title, date, kind, and a known time. A lecture may also list approved documents with title, kind (slides, transcript, or other), and either a registry path or a private upload ID.</p>
    <button disabled={saving}>Save group</button>
   </form>
  </section>
  <p role="status">{status}</p>
 </main>;
}
