import {env} from 'cloudflare:workers';
import {requireAdmin} from '../../../lib/admin-auth';
import {academicGroups, type StudentProfile} from '../../../lib/student-profile';

export const dynamic = 'force-dynamic';

export async function GET(request:Request) {
 const denied = await requireAdmin(request);
 if (denied) return denied;
 const headers = {'Cache-Control':'no-store'};
 if (!env.DB) return Response.json({error:'Student directory unavailable.'},{status:503,headers});
 const [{results},groups,{results:passes},{results:questionStats}] = await Promise.all([
  env.DB.prepare('SELECT user_id, profile, created_at, active_at, completed_at FROM review_student_profiles ORDER BY active_at DESC LIMIT 500')
   .all<{user_id:string;profile:string;created_at:string;active_at:string;completed_at:string|null}>(),
  academicGroups(env.DB),
  env.DB.prepare(`SELECT p.user_id,p.lecture_id,p.pass FROM review_student_passes p JOIN
   (SELECT user_id,profile FROM review_student_profiles ORDER BY active_at DESC LIMIT 500) s ON s.user_id=p.user_id
   WHERE json_extract(s.profile,'$.analytics')=1`).all<{user_id:string;lecture_id:string;pass:number}>(),
  env.DB.prepare(`SELECT a.user_id,COUNT(*) AS attempted,SUM(a.correct) AS correct FROM review_student_answers a JOIN
   (SELECT user_id,profile FROM review_student_profiles ORDER BY active_at DESC LIMIT 500) s ON s.user_id=a.user_id
   WHERE json_extract(s.profile,'$.analytics')=1 GROUP BY a.user_id`).all<{user_id:string;attempted:number;correct:number}>()
 ]);
 const byStudent = new Map<string,Map<string,number[]>>();
 for (const pass of passes) {
  const lectures = byStudent.get(pass.user_id)||new Map<string,number[]>();
  lectures.set(pass.lecture_id,[...(lectures.get(pass.lecture_id)||[]),pass.pass]);
  byStudent.set(pass.user_id,lectures);
 }
 const scores = new Map(questionStats.map(row=>[row.user_id,{attempted:row.attempted,correct:row.correct}]));
 const students = results.map(row => {
  const profile = JSON.parse(row.profile) as StudentProfile;
  const lectures = groups.find(group=>group.classCode===profile.classCode && group.groupCode===profile.groupCode)?.lectures || [];
  const history = profile.analytics ? lectures.map(lecture=>({
   title:lecture.title,passes:profile.reviews[lecture.id]||[],completed:byStudent.get(row.user_id)?.get(lecture.id)||[]
  })) : null;
  return {name:profile.name,classCode:profile.classCode,groupCode:profile.groupCode,tblGroup:profile.tblGroup,labGroup:profile.labGroup,
   createdAt:row.created_at,activeAt:row.active_at,completed:!!row.completed_at,history,questions:profile.analytics?(scores.get(row.user_id)||{attempted:0,correct:0}):null};
 });
 return Response.json({students,limited:students.length===500},{headers});
}
