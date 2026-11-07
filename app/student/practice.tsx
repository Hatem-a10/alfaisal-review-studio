'use client';
import {useCallback,useEffect,useState} from 'react';
import type {Group} from '../../lib/student-profile';
import styles from './student.module.css';

type Question={id:string;question:string;options:string[]};
type Run={id:string;expiresAt:number;questions:Question[]};
type Score={correct:number;total:number;expired:boolean;result:{id:string;choice:number|null;answer:number;correct:boolean;explanation?:string}[]};

export function StudentPractice({group,accountKey}:{group:Group;accountKey:string}) {
 const [ids,setIds]=useState<string[]>([]);
 const [count,setCount]=useState(10);
 const [minutes,setMinutes]=useState(15);
 const [run,setRun]=useState<Run|null>(null);
 const [choices,setChoices]=useState<Record<string,number>>({});
 const [score,setScore]=useState<Score|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [now,setNow]=useState(0);
 const key='review-studio-student-practice:'+accountKey;

 useEffect(()=>{
  try {
   const cached=JSON.parse(sessionStorage.getItem(key)||'null');
   if (cached?.run?.id && Array.isArray(cached.run.questions)) {
    setRun(cached.run);setChoices(cached.choices||{});setNow(Date.now());
   }
  } catch {}
 },[key]);
 useEffect(()=>{
  if (!run||score) return;
  try {sessionStorage.setItem(key,JSON.stringify({run,choices}));}catch{}
 },[run,choices,score,key]);

 const send=useCallback(async <T,>(body:unknown):Promise<T>=>{
  const response=await fetch('/api/student-practice',{method:'POST',headers:{
   'Content-Type':'application/json','X-Review-Account':accountKey},body:JSON.stringify(body)});
  const data=await response.json() as T & {error?:string};
  if (!response.ok) throw Error(data.error||'Practice request failed.');
  return data;
 },[accountKey]);

 const submit=useCallback(async()=>{
  if (!run || busy || score) return;
  setBusy(true);setError('');
  try {setScore(await send<Score>({action:'submit',id:run.id,choices}));try{sessionStorage.removeItem(key)}catch{}}
  catch(error){setError(error instanceof Error?error.message:'Could not submit practice.');}
  finally{setBusy(false)}
 },[run,busy,score,send,choices,key]);

 useEffect(()=>{
  if (!run||score) return;
  const id=setInterval(()=>setNow(Date.now()),1000);
  return ()=>clearInterval(id);
 },[run,score]);
 useEffect(()=>{
  if (run && now>=run.expiresAt && !busy && !score && !error) submit();
 },[now,run,busy,score,error,submit]);

 async function start(){
  setBusy(true);setError('');
  try {setChoices({});setScore(null);setRun(await send<Run>({action:'start',lectureIds:ids,count,minutes}));setNow(Date.now());}
  catch(error){setError(error instanceof Error?error.message:'Could not start practice.');}
  finally{setBusy(false)}
 }

 const seconds=run?Math.max(0,Math.ceil((run.expiresAt-now)/1000)):0;
 return <details><summary>Timed mock practice</summary>
  {!run?<div className={styles.lesson}>
   <label>Lessons (select up to 12)<select multiple size={5} value={ids}
    onChange={event=>setIds(Array.from(event.target.selectedOptions,option=>option.value))}>
    {group.lectures.map(lecture=><option key={lecture.id} value={lecture.id}>{lecture.title}</option>)}
   </select></label>
   <label>Questions<input type="number" value={count} min={1} max={30} onChange={event=>setCount(Number(event.target.value))}/></label>
   <label>Minutes<input type="number" value={minutes} min={1} max={120} onChange={event=>setMinutes(Number(event.target.value))}/></label>
   <button type="button" disabled={busy||!ids.length||ids.length>12} onClick={start}>Start timed practice</button>
  </div>:<>
   {score?<p role="status">Score · {score.correct}/{score.total}{score.expired?' · Submission arrived after expiry':''}</p>:
    <p>Time remaining · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p>}
   {run.questions.map((question,index)=>{
    const result=score?.result.find(answer=>answer.id===question.id);
    return <fieldset key={question.id} disabled={busy||!seconds||!!score}><legend>{index+1}. {question.question}</legend>
     {question.options.map((option,choice)=><label key={choice}><input type="radio" name={'mock-'+index}
      checked={(result?.choice??choices[question.id])===choice} onChange={()=>setChoices(previous=>({...previous,[question.id]:choice}))}/>
      {option}{result?.answer===choice?' · Correct answer':''}</label>)}
     {result?.explanation&&<p>{result.explanation}</p>}
    </fieldset>;
   })}
   <div className={styles.row}>
    {!score&&<button type="button" className={styles.primary} disabled={busy} onClick={submit}>Submit practice</button>}
    <button type="button" disabled={busy} onClick={()=>{if(!score&&!confirm('Cancel this practice without submitting answers?'))return;
     try{sessionStorage.removeItem(key)}catch{}setRun(null);setScore(null);setChoices({});setError('');}}>{score?'New practice':'Cancel practice'}</button>
   </div>
  </>}
  {error&&<p role="alert">{error}</p>}
 </details>;
}
