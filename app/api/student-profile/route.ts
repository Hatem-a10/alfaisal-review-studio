import {env} from 'cloudflare:workers';
import {requireAccountMatch, reviewAccount} from '../../../lib/review-account';
import {academicGroups, cleanProfile} from '../../../lib/student-profile';

export const dynamic = 'force-dynamic';
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(request:Request) {
 const account = await reviewAccount(request.headers);
 if (!account || account.owner) return json({error:'Student access required.'},403);
 if (!env.DB || !env.REVIEW_OWNER_ID) return json({error:'Student setup is unavailable.'},503);
 const row = await env.DB.prepare('SELECT profile, completed_at FROM review_student_profiles WHERE user_id=?')
  .bind(account.id).first<{profile:string; completed_at:string|null}>();
 return json({profile:row ? JSON.parse(row.profile) : null, completed:!!row?.completed_at, groups:await academicGroups(env.DB)});
}

export async function PUT(request:Request) {
 const account = await reviewAccount(request.headers);
 if (!account || account.owner) return json({error:'Student access required.'},403);
 if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch = await requireAccountMatch(request);
 if (mismatch) return mismatch;
 const db = env.DB;
 if (!db || !env.REVIEW_OWNER_ID) return json({error:'Student setup is unavailable.'},503);
 const raw = await request.text();
 if (raw.length > 16_000) return json({error:'Profile is too large.'},413);
 let body:any;
 try { body=JSON.parse(raw); } catch {return json({error:'Invalid profile.'},400);}
 const finish = body?.finish === true;
 const profile = cleanProfile(body?.profile,await academicGroups(db),finish);
 if (!profile) return json({error:'Review your name, academic group and selected reviews.'},400);
 const now = new Date().toISOString();
 const completedAt = finish ? now : null;
 const result = await db.prepare(`INSERT INTO review_student_profiles(user_id,profile,created_at,active_at,completed_at)
  VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile=excluded.profile,active_at=excluded.active_at,
  completed_at=COALESCE(review_student_profiles.completed_at,excluded.completed_at)
  WHERE review_student_profiles.completed_at IS NULL OR excluded.completed_at IS NOT NULL`)
  .bind(account.id,JSON.stringify(profile),now,now,completedAt).run();
 if (!result.meta.changes) return json({error:'Your setup is complete. Reload to edit your profile.'},409);
 const saved = await db.prepare('SELECT completed_at FROM review_student_profiles WHERE user_id=?')
  .bind(account.id).first<{completed_at:string|null}>();
 return json({profile,completedAt:saved?.completed_at||null});
}

export async function DELETE(request:Request) {
 const account=await reviewAccount(request.headers);
 if (!account || account.owner) return json({error:'Student access required.'},403);
 if (request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Invalid origin.'},403);
 const mismatch=await requireAccountMatch(request);
 if (mismatch) return mismatch;
 if (!env.DB || !env.REVIEW_OWNER_ID) return json({error:'Student setup is unavailable.'},503);
 const db=env.DB;
 const tables=['review_student_passes','review_student_answers','review_student_practice',
  'review_student_grades','review_student_countdowns','review_student_profiles'];
 await db.batch(tables.map(table=>db.prepare('DELETE FROM '+table+' WHERE user_id=?').bind(account.id)));
 return json({deleted:true});
}
