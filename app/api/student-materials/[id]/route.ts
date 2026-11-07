import {env} from 'cloudflare:workers';
import {studentLessonAccess} from '../../../../lib/student-lesson-access';
import {materialOriginal} from '../../../../lib/material-dedup';

export const dynamic='force-dynamic';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const access=await studentLessonAccess(request,id);
 const value=new URL(request.url).searchParams.get('document')||'';
 const document=/^(?:0|[1-9]\d?)$/.test(value)?access?.lesson.documents?.[Number(value)]:undefined;
 if (!access || !document?.uploadId || !env.BUCKET || !env.REVIEW_OWNER_ID)
  return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const owner=env.REVIEW_OWNER_ID;
 const row=await access.db.prepare("SELECT id,name,mime FROM study_materials WHERE id=? AND user_id=? AND lecture_id!='ANKI'")
  .bind(document.uploadId,owner).first<{id:string;name:string;mime:string}>();
 const file=row?await materialOriginal(env.BUCKET,owner,row.id):null;
 if (!row || !file) return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const pdf=row.mime==='application/pdf';
 return new Response(file.body,{headers:{
  'Content-Type':pdf?'application/pdf':'application/octet-stream',
  'Content-Disposition':(pdf?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(row.name),
  'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
 }});
}
