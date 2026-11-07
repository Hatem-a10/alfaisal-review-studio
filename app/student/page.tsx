import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {env} from 'cloudflare:workers';
import {reviewAccount} from '../../lib/review-account';
import {academicGroups, type StudentProfile} from '../../lib/student-profile';
import {StudentSetup} from './setup';

export const dynamic = 'force-dynamic';

export default async function StudentPage() {
 const account = await reviewAccount(await headers());
 if (!account) redirect('/signin-with-chatgpt?return_to=%2Fstudent');
 if (account.owner) redirect('/index.html');
 if (!env.DB || !env.REVIEW_OWNER_ID) return <main><h1>Review Studio</h1><p>Student setup is unavailable.</p></main>;
 const row = await env.DB.prepare('SELECT profile, completed_at FROM review_student_profiles WHERE user_id=?')
  .bind(account.id).first<{profile:string; completed_at:string|null}>();
 const [{results:reviews},{results:answerDays}]=await Promise.all([
  env.DB.prepare('SELECT lecture_id AS id,pass,completed_at AS at FROM review_student_passes WHERE user_id=?')
   .bind(account.id).all<{id:string;pass:number;at:string}>(),
  env.DB.prepare(`SELECT date(answered_at,'+3 hours') AS day,COUNT(*) AS count FROM review_student_answers
   WHERE user_id=? AND answered_at>=? GROUP BY day`)
   .bind(account.id,new Date(Date.now()-42*86400000).toISOString()).all<{day:string;count:number}>()
 ]);
 return <StudentSetup reviews={reviews} answerDays={answerDays} accountKey={account.key} groups={await academicGroups(env.DB)}
  initial={row ? JSON.parse(row.profile) as StudentProfile : null} completedAt={row?.completed_at||null} />;
}
