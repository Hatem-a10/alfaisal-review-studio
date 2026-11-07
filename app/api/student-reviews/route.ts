import {env} from 'cloudflare:workers';
import {requireAccountMatch,reviewAccount} from '../../../lib/review-account';
import {academicGroups,type StudentProfile} from '../../../lib/student-profile';

export const dynamic = 'force-dynamic';
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function PUT(request:Request) {
 const account = await reviewAccount(request.headers);
 if (!account || account.owner) return json({error:'Student access required.'},403);
 if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch = await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const db = env.DB;
 if (!db || !env.REVIEW_OWNER_ID) return json({error:'Study progress is unavailable.'},503);
 const raw = await request.text();
 if (raw.length > 512) return json({error:'Invalid review.'},400);
 let body:any;
 try {body=JSON.parse(raw);} catch {return json({error:'Invalid review.'},400);}
 const {lectureId,pass,complete} = body || {};
 if (typeof lectureId!=='string' || ![0,1,2].includes(pass) || typeof complete!=='boolean')
  return json({error:'Invalid review.'},400);
 const row = await db.prepare('SELECT profile FROM review_student_profiles WHERE user_id=? AND completed_at IS NOT NULL')
  .bind(account.id).first<{profile:string}>();
 if (!row) return json({error:'Finish student setup first.'},403);
 const profile = JSON.parse(row.profile) as StudentProfile;
 const group = (await academicGroups(db)).find(group=>group.classCode===profile.classCode && group.groupCode===profile.groupCode);
 if (!group?.lectures.some(lecture=>lecture.id===lectureId) || profile.reviews[lectureId]?.includes(pass))
  return json({error:'This review is not available.'},403);

 const now = new Date().toISOString();
 const mutation = complete
  ?db.prepare(`INSERT INTO review_student_passes(user_id,lecture_id,pass,completed_at) VALUES(?,?,?,?)
   ON CONFLICT(user_id,lecture_id,pass) DO NOTHING`).bind(account.id,lectureId,pass,now)
  :db.prepare('DELETE FROM review_student_passes WHERE user_id=? AND lecture_id=? AND pass=?').bind(account.id,lectureId,pass);
 await db.batch([mutation,db.prepare('UPDATE review_student_profiles SET active_at=? WHERE user_id=?').bind(now,account.id)]);
 return json({complete});
}
