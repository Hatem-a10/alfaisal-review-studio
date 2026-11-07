import {env} from 'cloudflare:workers';
import {requireAccountMatch,reviewAccount} from '../../../lib/review-account';
import {validGrades} from '../../../lib/student-grades';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function access(request:Request) {
 const account=await reviewAccount(request.headers),db=env.DB;
 if (!account || account.owner || !env.REVIEW_OWNER_ID || !db) return null;
 const profile=await db.prepare('SELECT 1 FROM review_student_profiles WHERE user_id=? AND completed_at IS NOT NULL')
  .bind(account.id).first();
 return profile ? {account,db} : null;
}
export async function GET(request:Request) {
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const context=await access(request);
 if (!context) return json({error:'Student access required.'},403);
 const row=await context.db.prepare('SELECT grades,revision FROM review_student_grades WHERE user_id=?')
  .bind(context.account.id).first<{grades:string;revision:number}>();
 return json({grades:row?JSON.parse(row.grades):{},revision:row?.revision||0});
}
export async function PUT(request:Request) {
 if (request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const context=await access(request);
 if (!context) return json({error:'Student access required.'},403);
 const raw=await request.text();
 if (raw.length>24000) return json({error:'Too many grade entries.'},413);
 let body:any;
 try {body=JSON.parse(raw);} catch {return json({error:'Invalid grades.'},400);}
 const {grades,revision}=body||{};
 if (!validGrades(grades)||!Number.isSafeInteger(revision)||revision<0)
  return json({error:'Check the assessment names, weights and marks.'},400);
 const result=revision===0
  ?await context.db.prepare(`INSERT INTO review_student_grades(user_id,grades,revision) VALUES(?,?,1)
    ON CONFLICT(user_id) DO NOTHING`).bind(context.account.id,JSON.stringify(grades)).run()
  :await context.db.prepare('UPDATE review_student_grades SET grades=?,revision=revision+1 WHERE user_id=? AND revision=?')
   .bind(JSON.stringify(grades),context.account.id,revision).run();
 if (!result.meta.changes) return json({error:'Grades changed on another device. Reload your saved grades before updating them.'},409);
 return json({saved:true,revision:revision+1});
}
