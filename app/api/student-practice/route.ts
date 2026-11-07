import {requireAccountMatch} from '../../../lib/review-account';
import {studentGroupAccess} from '../../../lib/student-lesson-access';
import {studentTopics,type Question} from '../../../lib/student-lessons';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request) {
 if (request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const context=await studentGroupAccess(request);
 if (!context) return json({error:'Finish student setup first.'},403);
 const raw=await request.text();
 if (raw.length>8000) return json({error:'Invalid practice request.'},400);
 let body:any;
 try {body=JSON.parse(raw);} catch {return json({error:'Invalid practice request.'},400);}
 const {db,account,group}=context;
 if (body?.action==='start') {
  const {lectureIds,count,minutes}=body;
  if (!Array.isArray(lectureIds)||!lectureIds.length||lectureIds.length>12||
      lectureIds.some(id=>!group.lectures.some(lecture=>lecture.id===id))||
      !Number.isInteger(count)||count<1||count>30||
      !Number.isInteger(minutes)||minutes<1||minutes>120)
   return json({error:'Choose assigned lessons and a valid practice length.'},400);
  const limit=await db.prepare('SELECT COUNT(*) AS count FROM review_student_practice WHERE user_id=? AND expires_at>?')
   .bind(account.id,Date.now()-86400000).first<{count:number}>();
  if ((limit?.count||0)>=30) return json({error:'Daily practice session limit reached.'},429);
  const packs=await Promise.all([...new Set<string>(lectureIds)].map(studentTopics));
  const unique=new Map<string,Question>();
  for(const topic of packs.flat()) for(const question of topic.questions) unique.set(question.id,question);
  const questions=[...unique.values()];
  if (!questions.length) return json({error:'There are no questions for these lessons.'},400);
  for(let i=questions.length-1;i>0;i--){
   const random=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
   [questions[i],questions[random]]=[questions[random],questions[i]];
  }
  const chosen=questions.slice(0,count);
  const id=crypto.randomUUID(),expiresAt=Date.now()+minutes*60000;
  await db.batch([
   db.prepare('DELETE FROM review_student_practice WHERE user_id=? AND expires_at<? AND result IS NULL').bind(account.id,Date.now()-86400000),
   db.prepare('INSERT INTO review_student_practice(user_id,id,expires_at,questions) VALUES(?,?,?,?)')
    .bind(account.id,id,expiresAt,JSON.stringify(chosen))
  ]);
  return json({id,expiresAt,questions:chosen.map(({id,question,options})=>({id,question,options}))});
 }
 if (body?.action!=='submit'||typeof body.id!=='string'||!body.choices||Array.isArray(body.choices)||typeof body.choices!=='object')
  return json({error:'Invalid practice submission.'},400);
 const row=await db.prepare('SELECT expires_at,questions,result FROM review_student_practice WHERE user_id=? AND id=?')
  .bind(account.id,body.id).first<{expires_at:number;questions:string;result:string|null}>();
 if (!row) return json({error:'Practice session not found.'},404);
 if (row.result) return json(JSON.parse(row.result));
 // Allow a short transport window for the browser's automatic expiry submission.
 const expired=Date.now()>row.expires_at+10000;
 const questions=JSON.parse(row.questions) as Question[];
 const result=questions.map(question=>{
  const choice=Object.hasOwn(body.choices,question.id)?body.choices[question.id]:null;
  const selected=!expired && Number.isInteger(choice)&&choice>=0&&choice<question.options.length?choice:null;
  return {id:question.id,choice:selected,correct:selected===question.answer,answer:question.answer,
   explanation:question.explanation,reasons:question.reasons};
 });
 const payload={result,correct:result.filter(answer=>answer.correct).length,total:result.length,expired};
 const saved=await db.prepare('UPDATE review_student_practice SET result=? WHERE user_id=? AND id=? AND result IS NULL RETURNING result')
  .bind(JSON.stringify(payload),account.id,body.id).first<{result:string}>();
 if (saved) {
  await db.prepare('UPDATE review_student_profiles SET active_at=? WHERE user_id=?').bind(new Date().toISOString(),account.id).run();
  return json(payload);
 }
 const prior=await db.prepare('SELECT result FROM review_student_practice WHERE user_id=? AND id=?')
  .bind(account.id,body.id).first<{result:string}>();
 return prior ? json(JSON.parse(prior.result)) : json({error:'Practice session changed.'},409);
}
