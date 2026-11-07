import {env} from 'cloudflare:workers';
import {reviewAccount} from './review-account';
import {academicGroups,type StudentProfile} from './student-profile';

export async function studentGroupAccess(request:Request) {
 const account=await reviewAccount(request.headers),db=env.DB;
 if (!account || account.owner || !db || !env.REVIEW_OWNER_ID) return null;
 const row=await db.prepare('SELECT profile FROM review_student_profiles WHERE user_id=? AND completed_at IS NOT NULL')
  .bind(account.id).first<{profile:string}>();
 if (!row) return null;
 const profile=JSON.parse(row.profile) as StudentProfile;
 const group=(await academicGroups(db)).find(group=>group.classCode===profile.classCode && group.groupCode===profile.groupCode);
 return group ? {db,account,group} : null;
}

export async function studentLessonAccess(request:Request,id:string) {
 const context=await studentGroupAccess(request);
 const lesson=context?.group.lectures.find(lecture=>lecture.id===id);
 return context && lesson ? {...context,lesson} : null;
}
