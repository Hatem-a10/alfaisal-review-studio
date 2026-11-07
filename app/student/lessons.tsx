'use client';
import {useEffect,useState} from 'react';
import type {Group,Lecture} from '../../lib/student-profile';
import styles from './student.module.css';

type Answer={id:string;choice:number;correct:number|boolean;answer?:number;reasons?:string[];explanation?:string};
type Question={id:string;question:string;options:string[]};
type Topic={id:string;title:string;body:string[];keyPoints:string[];questions:Question[]};
type Pack={lesson:Lecture;topics:Topic[];answers:Answer[]};

export function StudentLessons({group,accountKey}:{group:Group;accountKey:string}) {
 const [id,setId]=useState('');
 const [pack,setPack]=useState<Pack|null>(null);
 const [topicIndex,setTopicIndex]=useState(0);
 const [draft,setDraft]=useState<Record<string,number>>({});
 const [answers,setAnswers]=useState<Record<string,Answer>>({});
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  if (!id) return;
  const controller=new AbortController();
  const open=async()=>{
   setPack(null);
   setStatus('Loading lesson…');
   setDraft({});
   try {
    const response=await fetch('/api/student-lessons/'+encodeURIComponent(id),{
     headers:{'X-Review-Account':accountKey},signal:controller.signal});
    const data=await response.json() as Pack & {error?:string};
    if (!response.ok) throw Error(data.error||'Could not load this lesson.');
    if (controller.signal.aborted) return;
    const recorded=Object.fromEntries(data.answers.map(answer=>[answer.id,answer]));
    const first=data.topics.findIndex(topic=>!complete(topic,recorded));
    setAnswers(recorded);
    setTopicIndex(Math.max(0,first));
    setPack(data);
    setStatus('');
   } catch(error) {
    if (!controller.signal.aborted) setStatus(error instanceof Error?error.message:'Could not load this lesson.');
   }
  };
  open();
  return ()=>controller.abort();
 },[id,accountKey]);

 const topic=pack?.lesson.id===id?pack.topics[topicIndex]:undefined;
 const selected=topic?.questions.filter(question=>Object.hasOwn(draft,question.id))||[];
 const graded=topic?.questions.filter(question=>answers[question.id])||[];
 const correct=graded.filter(question=>answers[question.id].correct).length;

 function go(index:number) {
  setTopicIndex(index);
  setDraft({});
  setStatus('');
 }

 async function submit() {
  if (!topic || !selected.length || busy) return;
  setBusy(true);
  try {
   const choices=Object.fromEntries(selected.map(question=>[question.id,draft[question.id]]));
   const response=await fetch('/api/student-lessons/'+encodeURIComponent(id),{
    method:'POST',headers:{'Content-Type':'application/json','X-Review-Account':accountKey},
    body:JSON.stringify({topicId:topic.id,choices})
   });
   const data=await response.json() as {error?:string;results:Answer[]};
   if (!response.ok) throw Error(data.error||'Could not save answers.');
   setAnswers(previous=>({...previous,...Object.fromEntries(data.results.map(answer=>[answer.id,answer]))}));
   setDraft({});
   setStatus('Answers checked and saved.');
  } catch(error) {
   setStatus(error instanceof Error?error.message:'Could not save answers.');
  } finally {setBusy(false)}
 }

 return <section className={styles.lesson}>
  <h2>Learn &amp; Master</h2>
  <label>Assigned lesson<select value={id} disabled={busy} onChange={event=>setId(event.target.value)}>
   <option value="">Choose a lesson</option>
   {group.lectures.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.course} · {lesson.title}</option>)}
  </select></label>
  {pack && !pack.topics.length && <p>No learning cards are available for this lesson.</p>}
  {topic && pack && <>
   <label>Concept card<select disabled={busy} value={topicIndex} onChange={event=>go(Number(event.target.value))}>
    {pack.topics.map((item,index)=><option key={item.id} value={index}>{complete(item,answers)?'✓ ':''}{item.title}</option>)}
   </select></label>
   <article key={topic.id}>
    <h3>{topic.title}</h3>
    {topic.body.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
    {!!topic.keyPoints.length&&<><h4>What to remember</h4><ul>{topic.keyPoints.map((point,index)=><li key={index}>{point}</li>)}</ul></>}
    <h4>Practice questions</h4>
    {topic.questions.map((question,index)=>{
     const feedback=answers[question.id];
     return <fieldset key={question.id} disabled={busy}>
      <legend>{index+1}. {question.question}</legend>
      {question.options.map((option,choice)=><label key={choice} className={styles.choice}>
       <input type="radio" name={'question-'+index} checked={(draft[question.id]??feedback?.choice)===choice}
        onChange={()=>setDraft(previous=>({...previous,[question.id]:choice}))}/>
       <span>{option}</span>
      </label>)}
      {feedback && <p>{feedback.correct?'✓ Correct':'Incorrect'}{feedback.explanation?' · '+feedback.explanation:''}</p>}
      {feedback?.reasons?.length ? <details><summary>Answer explanations</summary><ol type="A">
       {feedback.reasons.map((reason,choice)=><li key={choice}>{choice===feedback.answer?'Correct · ':''}{reason}</li>)}
      </ol></details> : null}
     </fieldset>;
    })}
    {!!graded.length && <p role="status">Topic score · {correct}/{graded.length} correct · {graded.length}/{topic.questions.length} checked</p>}
    <div className={styles.row}>
     <button type="button" disabled={busy||topicIndex===0} onClick={()=>go(topicIndex-1)}>Previous card</button>
     <button type="button" className={styles.primary} disabled={busy||!selected.length} onClick={submit}>Check my answers</button>
     <button type="button" disabled={busy||topicIndex>=pack.topics.length-1} onClick={()=>go(topicIndex+1)}>Next card →</button>
    </div>
   </article>
  </>}
  {status && <p role="status">{status}</p>}
 </section>;
}

function complete(topic:Topic,answers:Record<string,Answer>) {
 const total=topic.questions.length;
 return total>0 && topic.questions.filter(question=>answers[question.id]?.correct).length>=Math.ceil(total*.85);
}
