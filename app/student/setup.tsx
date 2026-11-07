'use client';

import {useState, type CSSProperties, type FormEvent} from 'react';
import {classes, eventsForStudent, type LabStream, type EnglishSchedule, type Group, type StudentProfile} from '../../lib/student-profile';
import {riyadhDate,studentPlan} from '../../lib/student-plan';
import {AcademicTools} from './academic-tools';
import {StudentAnki} from './local-anki';
import {StudentPractice} from './practice';
import {StudentLessons} from './lessons';
import styles from './student.module.css';

const defaults:StudentProfile = {step:1,name:'',classCode:'',groupCode:'',theme:'light',
 accent:'#2f6c52',reviews:{},plan:'gradual',analytics:false};
const titles = ['Welcome to Review Studio','Tell us about yourself','Personalize your space',
 'What have you already studied?','Choose your study plan','You’re ready'];
const accents = ['#2f6c52','#325ac0','#8a4dac','#b64e31'];

export function StudentSetup({accountKey,initial,groups,completedAt,reviews,answerDays}:{
 accountKey:string; initial:StudentProfile|null; groups:Group[]; completedAt:string|null; reviews:{id:string;pass:number;at:string}[]; answerDays:{day:string;count:number}[];
}) {
 const [scheduleDay,setScheduleDay]=useState(()=>riyadhDate(new Date()));
 const [english,setEnglish]=useState<EnglishSchedule|null>(initial?.english||null);
 const [profile,setProfile] = useState(initial || defaults);
 const [joined,setJoined] = useState(completedAt);
 const finished = !!joined;
 const [completedPasses,setCompletedPasses] = useState(new Set(reviews.map(row=>row.id+':'+row.pass)));
 const [editing,setEditing] = useState(false);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const group = groups.find(row => row.classCode===profile.classCode && row.groupCode===profile.groupCode);
 const classGroups = groups.filter(row => row.classCode===profile.classCode);
 const courses = new Map<string,Group['lectures']>();
 for (const lecture of group?.lectures || []) {
  courses.set(lecture.course,[...(courses.get(lecture.course)||[]),lecture]);
 }
 const reviewCount = Object.values(profile.reviews).reduce((sum,passes)=>sum+passes.length,0);
 const set = (change:Partial<StudentProfile>) => setProfile(old => ({...old,...change}));

 async function save(next:StudentProfile,finish:boolean) {
  setBusy(true);
  setError('');
  try {
   const response = await fetch('/api/student-profile',{method:'PUT',headers:{
    'Content-Type':'application/json','X-Review-Account':accountKey},body:JSON.stringify({profile:next,finish})});
   const data = await response.json() as {error?:string;profile:StudentProfile;completedAt:string|null};
   if (!response.ok) throw Error(data.error || 'Setup could not be saved.');
   setProfile(data.profile);
   if (finish) {
    setJoined(data.completedAt);
    setEditing(false);
   }
  } catch (error) {
   setError(error instanceof Error ? error.message : 'Setup could not be saved.');
  } finally {
   setBusy(false);
  }
 }

 function advance(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (profile.step===2 && (!profile.name.trim() || !group || (group.tblGroups?.length&&!profile.tblGroup))) {
   setError('Enter your preferred name and choose your section and TBL group.');
   return;
  }
  if (english && (!english.start || !english.end || english.start>=english.end)) {
   setError('Enter an English start and end time. The end time must be later.');
   return;
  }
  if (editing && profile.step<6) {set({step:profile.step+1});return;}
  save({...profile,english:english||undefined,step:Math.min(6,profile.step+1)},profile.step===6);
 }

 async function deleteStudentData() {
  if (busy || !confirm('Delete your student profile, grades, and saved Review Studio progress? This cannot be undone.')) return;
  setBusy(true);
  setError('');
  try {
   const response=await fetch('/api/student-profile',{method:'DELETE',headers:{'X-Review-Account':accountKey}});
   const data=await response.json() as {error?:string};
   if (!response.ok) throw Error(data.error||'Your data could not be deleted.');
   try {sessionStorage.removeItem('review-studio-student-practice:'+accountKey)} catch {}
   location.assign('/student');
  } catch(error) {setError(error instanceof Error?error.message:'Your data could not be deleted.');}
  finally {setBusy(false)}
 }

 async function completeReview(lectureId:string,pass:number,complete:boolean) {
  setBusy(true);
  setError('');
  try {
   const response = await fetch('/api/student-reviews',{method:'PUT',headers:{
    'Content-Type':'application/json','X-Review-Account':accountKey
   },body:JSON.stringify({lectureId,pass,complete})});
   const data = await response.json() as {error?:string};
   if (!response.ok) throw Error(data.error || 'Review could not be saved.');
   const key = lectureId+':'+pass;
   setCompletedPasses(old=>{const next=new Set(old);if(complete)next.add(key);else next.delete(key);return next});
  } catch (error) {
   setError(error instanceof Error?error.message:'Review could not be saved.');
  } finally {setBusy(false)}
 }

 function setPass(ids:string[],pass:number,checked:boolean) {
  setProfile(current => {
   const reviews = {...current.reviews};
   for (const id of ids) {
    const passes = new Set(reviews[id] || []);
    if (checked) passes.add(pass);
    else passes.delete(pass);
    if (passes.size) reviews[id]=[...passes].sort();
    else delete reviews[id];
   }
   return {...current,reviews};
  });
 }

 const today = riyadhDate(new Date());
 const studyPlan = group && joined ? studentPlan(group,profile,riyadhDate(new Date(joined))) : [];
 const schedule=group?eventsForStudent(group,profile):[];
 const daily=schedule.filter(event=>event.date===scheduleDay).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const hasLabRestrictions=group?.events?.some(event=>event.labStream);
 const personalEnglish=profile.english;
 const englishDays=personalEnglish?.pattern==='mon-wed'?[1,3]:[0,2,4];
 const englishSlots=personalEnglish?Array.from({length:14},(_,offset)=>{
  const date=new Date(today+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+offset);
  return date;
 }).filter(date=>englishDays.includes(date.getUTCDay()) &&
  !group?.events?.some(event=>event.kind==='break'&&!event.time&&event.date===date.toISOString().slice(0,10))):[];
 const theme = {background:profile.theme==='amoled'?'#000':profile.theme==='dark'?'#1a202c':'#f4f6f3',
  color:profile.theme==='light'?'#15231d':'#eff5f1','--student-accent':profile.accent} as CSSProperties;

 if (finished && !editing) return <main className={styles.shell} style={theme}><div className={styles.card}>
  <p>REVIEW STUDIO · {profile.classCode}</p><h1>Welcome, {profile.name}</h1>
  <p>Section {profile.groupCode}{profile.tblGroup?' · TBL '+profile.tblGroup:''}{profile.labGroup?' · Lab '+profile.labGroup:''} · Asia/Riyadh</p>
  <p>{reviewCount} reviews marked as completed before joining.</p>
  {!group && <p>Your academic group’s official schedule is not configured.</p>}
  {group && <><StudentLessons group={group} accountKey={accountKey}/><StudentPractice group={group} accountKey={accountKey}/></>}
  <section><h2>Group schedule</h2>
   <div className={styles.row}>
    <label>Schedule day<input type="date" value={scheduleDay} onChange={event=>setScheduleDay(event.target.value)}/></label>
    <button type="button" onClick={()=>setScheduleDay(today)}>Today</button>
   </div>
   {hasLabRestrictions&&!profile.labGroup&&<p>Choose your optional lab stream and subgroup in Edit profile to see subgroup-only sessions.</p>}
   {daily.length ? <ul>{daily.map((event,index)=><li key={index}>
    {event.time?<strong>{event.time}{event.end?'–'+event.end:''} · </strong>:null}{event.title}
   </li>)}</ul> : <p>No verified events for this date.</p>}
  </section>
  {personalEnglish&&<details><summary>My English schedule</summary>
   <p>{personalEnglish.pattern==='mon-wed'?'Monday and Wednesday':'Sunday, Tuesday and Thursday'} · {personalEnglish.start}–{personalEnglish.end} Riyadh</p>
   <ul>{englishSlots.map(date=><li key={date.toISOString()}>{date.toISOString().slice(0,10)} · {personalEnglish.start}–{personalEnglish.end}</li>)}</ul>
  </details>}
  <section><h2>Review plan</h2>
   {studyPlan.length ? <ul>{studyPlan.map(item=><li key={item.id+':'+item.pass}>
    <label><input type="checkbox" disabled={busy} checked={completedPasses.has(item.id+':'+item.pass)}
     onChange={e=>completeReview(item.id,item.pass,e.target.checked)} />
    {item.title} · Pass {item.pass+1} · {item.date||'Unscheduled'}</label>
   </li>)}</ul> : <p>No pending configured reviews.</p>}
  </section>
  {[...courses].map(([course,lectures])=><details key={course}><summary>{course}</summary><ul>
   {lectures.map(lecture=><li key={lecture.id}>{lecture.title} · {profile.reviews[lecture.id]?.length||0}/3 historical reviews</li>)}
  </ul></details>)}
  {error && <p role="alert">{error}</p>}
  {group && <AcademicTools group={group} accountKey={accountKey}/>}
  <StudyActivity reviews={reviews} answerDays={answerDays} />
  {group&&<details><summary>Material Library</summary>
   {group.lectures.some(lecture=>lecture.documents?.length)?group.lectures.filter(lecture=>lecture.documents?.length).map(lecture=><section key={lecture.id}>
    <h3>{lecture.title}</h3><ul>{lecture.documents!.map((document,index)=><li key={document.path||document.uploadId}>
     <a href={document.path?'/api/site-assets/'+document.path.split('/').map(encodeURIComponent).join('/'):
      '/api/student-materials/'+encodeURIComponent(lecture.id)+'?document='+index} target="_blank" rel="noreferrer">{document.title}</a>
     {' · '+document.kind}
    </li>)}</ul>
   </section>):<p>No approved materials are assigned to this group yet.</p>}
  </details>}
  <StudentAnki accountKey={accountKey}/>
  <button type="button" onClick={()=>{set({step:2});setEditing(true)}}>Edit profile</button>
  <details><summary>Privacy and account data</summary>
   <p>You can change reporting consent in your profile. Deleting your student data removes your cloud profile, grades, and study records. Local Anki decks can be removed from the Anki panel.</p>
   <button type="button" disabled={busy} onClick={deleteStudentData}>Delete my student data</button>
  </details>
  <a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>
 </div></main>;

 return <main className={styles.shell} style={theme}><form className={styles.card} onSubmit={advance}>
  <p>REVIEW STUDIO · STEP {profile.step} OF 6</p>
  <progress value={profile.step} max={6} aria-label="Setup progress" />
  <h1>{titles[profile.step-1]}</h1>
  {profile.step===1 && <p>Organize lectures, track reviews, practice questions and prepare for assessments.</p>}
  {profile.step===2 && <>
   <label>Preferred name<input required maxLength={80} value={profile.name} onChange={e=>set({name:e.target.value})}/></label>
   <label>Timetable section<select required value={profile.classCode} onChange={event=>{
    const code=event.target.value,choices=groups.filter(row=>row.classCode===code);
    set({classCode:code,groupCode:choices.length===1?choices[0].groupCode:'',tblGroup:undefined,
     labStream:undefined,labGroup:undefined,reviews:{}});
   }}>
    <option value="">Choose a section</option>{classes.map(code=><option key={code}>{code}</option>)}
   </select></label>
   {classGroups.length>1&&<label>Schedule group<select required value={profile.groupCode}
    onChange={event=>set({groupCode:event.target.value,tblGroup:undefined,labStream:undefined,labGroup:undefined,reviews:{}})}>
    <option value="">Choose a schedule group</option>{classGroups.map(row=><option key={row.groupCode}>{row.groupCode}</option>)}
   </select></label>}
   {profile.classCode&&!classGroups.length&&<p>No verified timetable is configured for this section.</p>}
   {!!group?.tblGroups?.length&&<label>TBL group<select required value={profile.tblGroup||''}
    onChange={event=>set({tblGroup:event.target.value||undefined})}>
    <option value="">Choose your TBL group</option>{group.tblGroups.map(code=><option key={code}>{code}</option>)}
   </select></label>}
   {group?.labGroups&&<fieldset><legend>Lab assignment (optional)</legend>
    <label>Lab stream<select value={profile.labStream||''} onChange={event=>set({
     labStream:(event.target.value as LabStream)||undefined,labGroup:undefined})}>
     <option value="">I don’t know yet</option><option value="A">Stream A</option><option value="B">Stream B</option>
    </select></label>
    {profile.labStream&&<label>Lab subgroup<select value={profile.labGroup||''} onChange={event=>set({labGroup:event.target.value||undefined})}>
     <option value="">I don’t know yet</option>{group.labGroups[profile.labStream].map(code=><option key={code}>{code}</option>)}
    </select></label>}
   </fieldset>}
   <fieldset><legend>English schedule (optional)</legend>
    <label>When do you have English?<select value={english?.pattern||''} onChange={event=>{
     const pattern=event.target.value as EnglishSchedule['pattern']|'';
     setEnglish(pattern?{pattern,start:english?.start||'',end:english?.end||''}:null);
    }}>
     <option value="">Skip English scheduling</option>
     <option value="mon-wed">Monday and Wednesday</option>
     <option value="sun-tue-thu">Sunday, Tuesday and Thursday</option>
    </select></label>
    {english&&<div className={styles.row}>
     <label>Start time (Riyadh)<input type="time" required value={english.start}
      onChange={event=>setEnglish({...english,start:event.target.value})}/></label>
     <label>End time (Riyadh)<input type="time" required value={english.end}
      onChange={event=>setEnglish({...english,end:event.target.value})}/></label>
    </div>}
   </fieldset>
  </>}
  {profile.step===3 && <>
   <label>Theme<select value={profile.theme} onChange={e=>set({theme:e.target.value})}>
    <option value="light">Light</option><option value="dark">Dark</option><option value="amoled">AMOLED</option>
   </select></label>
   <label>Accent color<input type="color" value={profile.accent} onChange={e=>set({accent:e.target.value})}/></label>
   <div className={styles.row}>{accents.map(color=><button key={color} type="button" aria-label={'Use '+color}
    aria-pressed={color===profile.accent} style={{background:color,color:'white'}} onClick={()=>set({accent:color})}>●</button>)}</div>
  </>}
  {profile.step===4 && <>
   <p>Mark any reviews you already completed. Each pass is independent.</p>
   {[...courses].map(([course,lectures])=><details key={course}><summary>{course} · {lectures.length} lectures</summary>
    <div className={styles.row}>{[0,1,2].map(pass=><label key={pass}>
     <input type="checkbox" checked={lectures.every(lecture=>profile.reviews[lecture.id]?.includes(pass))}
      onChange={e=>setPass(lectures.map(lecture=>lecture.id),pass,e.target.checked)}/> All pass {pass+1}
    </label>)}</div>
    {lectures.map(lecture=><fieldset key={lecture.id}><legend>{lecture.title}</legend>
     <div className={styles.row}>{[0,1,2].map(pass=><label key={pass}><input type="checkbox"
      checked={!!profile.reviews[lecture.id]?.includes(pass)} onChange={e=>setPass([lecture.id],pass,e.target.checked)}/> Pass {pass+1}</label>)}</div>
    </fieldset>)}
   </details>)}
   {!courses.size && <p>No lectures are configured for this group yet.</p>}
  </>}
  {profile.step===5 && <>
   <label>How should Review Studio handle older unfinished work?<select value={profile.plan} onChange={e=>set({plan:e.target.value})}>
    <option value="gradual">Gradual catch-up</option><option value="upcoming">Focus on upcoming work</option><option value="later">Customize later</option>
   </select></label>
   <p>Administrators can manage accounts and view operational activity such as registration and last active time.</p>
   <label><input type="checkbox" checked={profile.analytics} onChange={e=>set({analytics:e.target.checked})}/>
    Allow administrators to view identifiable study progress reports when available</label>
  </>}
  {profile.step===6 && <dl><dt>Name</dt><dd>{profile.name}</dd><dt>Academic group</dt><dd>{profile.classCode} · {profile.groupCode}</dd>
   {profile.tblGroup&&<><dt>TBL group</dt><dd>{profile.tblGroup}</dd></>}{profile.labGroup&&<><dt>Lab subgroup</dt><dd>{profile.labGroup}</dd></>}<dt>Appearance</dt><dd>{profile.theme}</dd>
   {english&&<><dt>English</dt><dd>{english.pattern==='mon-wed'?'Monday and Wednesday':'Sunday, Tuesday and Thursday'} · {english.start}–{english.end}</dd></>}<dt>Previously completed reviews</dt><dd>{reviewCount}</dd></dl>}
  {error && <p role="alert">{error}</p>}
  <div className={styles.row}>
   {profile.step>1 && <button type="button" disabled={busy} onClick={()=>editing?set({step:profile.step-1}):save({...profile,step:profile.step-1},false)}>Back</button>}
   {profile.step===4 && !editing && <button type="button" disabled={busy} onClick={()=>save({...profile,step:5,reviews:{}},false)}>Skip for now</button>}
   <button className={styles.primary} disabled={busy}>{busy?'Saving…':profile.step===1?'Get started':profile.step===6?'Enter Review Studio':'Next'}</button>
  </div>
  <a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>
 </form></main>;
}

function StudyActivity({reviews,answerDays}:{reviews:{at:string}[];answerDays:{day:string;count:number}[]}) {
 const activity=new Map<string,{reviews:number;questions:number}>();
 for(const row of answerDays) activity.set(row.day,{reviews:0,questions:row.count});
 for(const review of reviews) {
  const day=riyadhDate(new Date(review.at));
  const entry=activity.get(day)||{reviews:0,questions:0};
  activity.set(day,{...entry,reviews:entry.reviews+1});
 }
 const today=new Date(riyadhDate(new Date())+'T12:00:00Z');
 const days=Array.from({length:42},(_,index)=>{
  const day=new Date(today);
  day.setUTCDate(day.getUTCDate()+index-41);
  return day.toISOString().slice(0,10);
 });
 const active=days.filter(day=>activity.has(day)).length;
 const total=days.reduce((sum,day)=>sum+(activity.get(day)?.reviews||0)+(activity.get(day)?.questions||0),0);
 return <details><summary>Study activity · {active} active days</summary>
  <p>{total} recorded actions in the last six weeks. Uses saved reviews and latest answers. Earlier attempts may be undercounted.</p>
  <div className={styles.heatmap}>{days.map(day=>{
   const {reviews,questions}=activity.get(day)||{reviews:0,questions:0};
   const label=day+' · '+reviews+' reviews · '+questions+' latest answers';
   return <abbr key={day} aria-label={label} title={label} style={{background:reviews+questions
    ?'color-mix(in srgb,var(--student-accent) '+Math.min(90,26+(reviews+questions)*10)+'%,transparent)':undefined}}>
    {day.slice(-2)}
   </abbr>;
  })}</div>
 </details>;
}
