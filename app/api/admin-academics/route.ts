import {env} from 'cloudflare:workers';
import {assetFor} from '../../../lib/site-assets';
import {requireAdmin} from '../../../lib/admin-auth';
import {academicGroups,validGroup} from '../../../lib/student-profile';

export const dynamic = 'force-dynamic';
const json = (body:unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(request:Request) {
 const denied = await requireAdmin(request);
 if (denied) return denied;
 if (!env.DB) return json({error:'Academic configuration is unavailable.'},503);
 const [{results:uploads},groups]=await Promise.all([
  env.DB.prepare("SELECT id,name,lecture_id AS lectureId FROM study_materials WHERE user_id=? AND lecture_id!='ANKI' ORDER BY created_at DESC LIMIT 500")
   .bind(env.REVIEW_OWNER_ID).all<{id:string;name:string;lectureId:string}>(),academicGroups(env.DB)
 ]);
 return json({groups,uploads});
}

export async function PUT(request:Request) {
 const denied = await requireAdmin(request);
 if (denied) return denied;
 if (!env.DB) return json({error:'Academic configuration is unavailable.'},503);
 const raw = await request.text();
 if (raw.length > 96_000) return json({error:'Academic configuration is too large.'},413);
 let group:unknown;
 try {group=JSON.parse(raw);} catch {return json({error:'Invalid academic configuration.'},400);}
 if (!validGroup(group)) return json({error:'Use a supported class, verified group and known lecture IDs.'},400);
 const documents=group.lectures.flatMap(lecture=>lecture.documents||[]);
 if (documents.some(doc=>doc.path&&!assetFor(doc.path)))
  return json({error:'Shared registry documents must match an approved asset path.'},400);
 const uploadIds=[...new Set(documents.flatMap(doc=>doc.uploadId?[doc.uploadId]:[]))];
 for(let i=0;i<uploadIds.length;i+=50) {
  const batch=uploadIds.slice(i,i+50);
  const {results}=await env.DB.prepare("SELECT id FROM study_materials WHERE user_id=? AND lecture_id!='ANKI' AND id IN ("+
   batch.map(()=>'?').join(',')+")").bind(env.REVIEW_OWNER_ID,...batch).all<{id:string}>();
  if(results.length!==batch.length) return json({error:'One or more shared uploads could not be found in your library.'},400);
 }
 const {classCode,groupCode,lectures,events,tblGroups,labGroups} = group;
 const configuration = JSON.stringify({classCode,groupCode,tblGroups,labGroups,lectures:lectures.map(({id,title,course,availableOn,reviewsOn,documents})=>({id,title,course,availableOn,reviewsOn,documents:documents?.map(({title,path,uploadId,kind})=>({title,path,uploadId,kind}))})),events:events?.map(({title,date,time,end,kind,labStream,labGroups})=>({title,date,time,end,kind,labStream,labGroups}))});
 await env.DB.prepare(`INSERT INTO review_academic_groups(class_code,group_code,configuration) VALUES(?,?,?)
  ON CONFLICT(class_code,group_code) DO UPDATE SET configuration=excluded.configuration`)
  .bind(classCode,groupCode,configuration).run();
 return json({saved:true});
}
