import {env} from 'cloudflare:workers';
import {withMaterialLectureLinks} from '../../../lib/material-lecture-links';
import type {MaterialRow} from '../../../lib/material-dedup';
import {digest,knownOriginal,materialRows,duplicateMaterial} from '../../../lib/material-dedup';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to read materials.'},401);if(!env.DB)return json({error:'Storage unavailable.'},503);const rows=await env.DB.prepare("SELECT id, name, lecture_id AS lectureId, mime, bytes, page_count AS pageCount, created_at AS createdAt FROM study_materials WHERE user_id = ? AND lecture_id != 'ANKI' ORDER BY created_at DESC").bind(user).all<MaterialRow>();return json({materials:rows.results.map(withMaterialLectureLinks)})}
export async function POST(request:Request){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to upload materials.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB||!env.BUCKET)return json({error:'Material storage is unavailable.'},503);
 if(Number(request.headers.get('content-length'))>29000000)return json({error:'Maximum file size is 25 MB.'},413);
 let form;try{form=await request.formData()}catch{return json({error:'Use a supported document upload.'},400)}
 const file=form.get('file');if(!(file instanceof File)||file.size>25000000||file.size<1)return json({error:'Choose a file up to 25 MB.'},400);
 const lectureId=String(form.get('lectureId')||'');if(!/^(MOL-(?:[1-9]|1\d|2[0-8])|CVP-P(?:[1-9]|1\d|2[0-8])|CVP-A(?:[1-9]|1\d|2[0-3]))$/.test(lectureId))return json({error:'Choose a known lecture.'},400);
 let parsed;const raw=String(form.get('extraction')||'');if(raw.length>8000000)return json({error:'Extracted text is too large; split the document.'},413);try{parsed=JSON.parse(raw)}catch{return json({error:'Document text could not be parsed.'},400)}
 if(!Array.isArray(parsed.pages)||parsed.pages.length<1||parsed.pages.length>1200||parsed.pages.some((p:{page:number;text:string})=>!Number.isInteger(p.page)||p.page<1||typeof p.text!=='string'||p.text.length>100000))return json({error:'Invalid extracted pages.'},400);
 const mime=file.type==='application/pdf'?'application/pdf':/\.json$/i.test(file.name)?'application/json':/\.(pptx|docx)$/i.test(file.name)?'application/octet-stream':'text/plain';if(!/\.(pdf|txt|md|json|pptx|docx)$/i.test(file.name))return json({error:'Use PDF, PPTX, DOCX, TXT, Markdown or a question-pack JSON file.'},400);
 const bytes=await file.arrayBuffer(),sha=await digest(bytes),known=await knownOriginal(env.BUCKET,sha,bytes.byteLength);
 if(known)return json({duplicate:true,builtin:true,url:known.url,name:known.name});
 const existing=await duplicateMaterial(env.BUCKET,user,await materialRows(env.DB,user),sha,bytes.byteLength);if(existing)return json({...withMaterialLectureLinks(existing),duplicate:true});
 const id=crypto.randomUUID(),base='materials/'+user+'/'+id,createdAt=new Date().toISOString();
 await env.BUCKET.put(base+'/original',bytes,{httpMetadata:{contentType:mime}});
 await env.BUCKET.put(base+'/text',JSON.stringify({pages:parsed.pages,pack:parsed.pack||null,figures:Array.isArray(parsed.figures)?parsed.figures.filter((f:{page:number;image:string})=>Number.isInteger(f.page)&&f.page>0&&typeof f.image==='string'&&f.image.length<200000&&/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(f.image)).slice(0,60):[]}),{httpMetadata:{contentType:'application/json'}});
 try{await env.DB.prepare('INSERT INTO study_materials (id,user_id,name,lecture_id,mime,bytes,page_count,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,user,file.name.slice(0,250),lectureId,mime,file.size,parsed.pages.length,createdAt).run()}catch(error){await env.BUCKET.delete([base+'/original',base+'/text']);throw error}
 return json(withMaterialLectureLinks({id,name:file.name.slice(0,250),lectureId,mime,bytes:file.size,pageCount:parsed.pages.length,createdAt}));
}
