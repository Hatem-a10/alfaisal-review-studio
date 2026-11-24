import {env} from 'cloudflare:workers';
import {materialOriginal} from '../../../../lib/material-dedup';
export const dynamic='force-dynamic';
const json=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const safeMime=(v:string)=>['application/pdf','application/json','text/plain','application/octet-stream'].includes(v)?v:'application/octet-stream';
// A5-245: normalize malformed surrogate code units without UTF-8 encode/decode allocations.
const filename=(v:string)=>encodeURIComponent((typeof v==='string'?v:'document').toWellFormed()).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return json('Sign in required.',401);
 const {id}=await params;if(!/^[\w-]{1,80}$/.test(id))return json('Invalid document.',400);
 if(!env.DB||!env.BUCKET)return json('Storage unavailable.',503);
 const row=await env.DB.prepare("SELECT id, name, mime, lecture_id AS lectureId FROM study_materials WHERE id = ? AND user_id = ? AND lecture_id != 'ANKI'").bind(id,user).first<{id:string;name:string;mime:string;lectureId:string}>();if(!row||row.lectureId==='ANKI')return json('Not found.',404);
 const text=new URL(request.url).searchParams.get('format')==='text',obj=text?await env.BUCKET.get('materials/'+user+'/'+id+'/text'):await materialOriginal(env.BUCKET,user,id);if(!obj)return json('Not found.',404);
 return new Response(obj.body,{headers:{'Content-Type':text?'application/json':safeMime(row.mime),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(!text?{'Content-Disposition':(row.mime==='application/pdf'?'inline':'attachment')+'; filename*=UTF-8\'\''+filename(row.name)}:{})}})
}
