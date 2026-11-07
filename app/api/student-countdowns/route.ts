import {env} from 'cloudflare:workers';
import {requireAccountMatch,reviewAccount} from '../../../lib/review-account';
import {validEvent} from '../../../lib/student-profile';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function context(request:Request) {
 const account=await reviewAccount(request.headers),db=env.DB;
 if (!account || account.owner || !db || !env.REVIEW_OWNER_ID) return null;
 const row=await db.prepare('SELECT 1 FROM review_student_profiles WHERE user_id=? AND completed_at IS NOT NULL')
  .bind(account.id).first();
 return row?{db,id:account.id}:null;
}

export async function GET(request:Request) {
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const access=await context(request);
 if (!access) return json({error:'Student access required.'},403);
 const {results}=await access.db.prepare('SELECT id,event FROM review_student_countdowns WHERE user_id=?')
  .bind(access.id).all<{id:string;event:string}>();
 return json({events:results.map(row=>({...JSON.parse(row.event),id:row.id}))});
}

export async function POST(request:Request) {
 if (request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const access=await context(request);
 if (!access) return json({error:'Student access required.'},403);
 const raw=await request.text();
 if (raw.length>2000) return json({error:'Invalid countdown.'},400);
 let body:any;
 try {body=JSON.parse(raw);} catch {return json({error:'Invalid countdown.'},400);}
 const id=body?.id;
 if (id!==undefined && (typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)))
  return json({error:'Invalid countdown ID.'},400);
 if (body?.action==='delete' && id) {
  await access.db.prepare('DELETE FROM review_student_countdowns WHERE user_id=? AND id=?').bind(access.id,id).run();
  return json({deleted:true});
 }
 const event=body?.event;
 if (body?.action!=='save'||!validEvent(event)||!['exam','tbl','class'].includes(event.kind))
  return json({error:'Enter a title, valid date and optional time.'},400);
 const clean={title:event.title,date:event.date,time:event.time,kind:event.kind};
 if (id) {
  const changed=await access.db.prepare('UPDATE review_student_countdowns SET event=? WHERE user_id=? AND id=?')
   .bind(JSON.stringify(clean),access.id,id).run();
  if (!changed.meta.changes) return json({error:'Countdown not found.'},404);
  return json({event:{...clean,id}});
 }
 const newId=crypto.randomUUID();
 const inserted=await access.db.prepare(`INSERT INTO review_student_countdowns(user_id,id,event)
  SELECT ?,?,? WHERE (SELECT COUNT(*) FROM review_student_countdowns WHERE user_id=?)<40`)
  .bind(access.id,newId,JSON.stringify(clean),access.id).run();
 if (!inserted.meta.changes) return json({error:'You can save up to 40 custom countdowns.'},409);
 return json({event:{...clean,id:newId}});
}
