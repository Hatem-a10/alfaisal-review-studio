import {studentTopics} from '../../../../lib/student-lessons';
import {requireAccountMatch} from '../../../../lib/review-account';
import {studentLessonAccess} from '../../../../lib/student-lesson-access';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
type Params={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Params) {
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const {id}=await params,access=await studentLessonAccess(request,id);
 if (!access) return json({error:'This lesson is not assigned to your account.'},403);
 const [content,{results}]=await Promise.all([studentTopics(id),access.db.prepare(
  'SELECT question_id AS id, choice, correct FROM review_student_answers WHERE user_id=? AND lecture_id=?'
 ).bind(access.account.id,id).all<{id:string;choice:number;correct:number}>()]);
 return json({lesson:access.lesson,topics:content.map(topic=>({...topic,questions:topic.questions.map(
  ({id,question,options})=>({id,question,options})
 )})),answers:results});
}

export async function POST(request:Request,{params}:Params) {
 if (request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const {id}=await params,access=await studentLessonAccess(request,id);
 if (!access) return json({error:'This lesson is not assigned to your account.'},403);
 const raw=await request.text();
 if (raw.length>12_000) return json({error:'Too many answers.'},413);
 let body:any;
 try { body=JSON.parse(raw); } catch { return json({error:'Invalid answer format.'},400); }
 const topic=(await studentTopics(id)).find(topic=>topic.id===body?.topicId);
 const choices=body?.choices;
 if (!topic || !choices || typeof choices!=='object' || Array.isArray(choices)) return json({error:'Invalid topic or answers.'},400);
 const entries=Object.entries(choices);
 if (!entries.length || entries.length>topic.questions.length) return json({error:'Choose an answer first.'},400);
 const results=[];
 const now=new Date().toISOString();
 for(const [questionId,value] of entries) {
  const question=topic.questions.find(question=>question.id===questionId);
  if (!question || typeof value!=='number' || !Number.isInteger(value) || value<0 || value>=question.options.length)
   return json({error:'Invalid question or option.'},400);
  results.push({id:question.id,choice:value,correct:value===question.answer,
   answer:question.answer,reasons:question.reasons,explanation:question.explanation});
 }
 await access.db.batch([
  ...results.map(result=>access.db.prepare(`INSERT INTO review_student_answers
   (user_id,lecture_id,question_id,choice,correct,answered_at) VALUES(?,?,?,?,?,?)
   ON CONFLICT(user_id,lecture_id,question_id) DO UPDATE SET choice=excluded.choice,correct=excluded.correct,answered_at=excluded.answered_at`)
   .bind(access.account.id,id,result.id,result.choice,Number(result.correct),now)),
  access.db.prepare('UPDATE review_student_profiles SET active_at=? WHERE user_id=?').bind(now,access.account.id)
 ]);
 return json({results});
}
