import {boundedForm,RequestTooLarge} from '../../../lib/bounded-request';
import {env} from 'cloudflare:workers';
import {lectureCourses} from '../../../public/course-registry.mjs';
import {withMaterialLectureLinks} from '../../../lib/material-lecture-links';
import type {MaterialRow} from '../../../lib/material-dedup';
import {digest,knownOriginal,materialRows,duplicateMaterial} from '../../../lib/material-dedup';
import {hasZipHeader,hasPdfHeader,withinPersonalQuota,reservePersonalUpload} from '../../../lib/personal-upload';
export const dynamic='force-dynamic';
const RESPONSE_HEADERS=Object.freeze({'Cache-Control':'no-store'});
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:RESPONSE_HEADERS});
export async function GET(request:Request){const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to read materials.'},401);if(!env.DB)return json({error:'Storage unavailable.'},503);const rows=await env.DB.prepare("SELECT id, name, lecture_id AS lectureId, mime, bytes, page_count AS pageCount, created_at AS createdAt FROM study_materials WHERE user_id = ? AND lecture_id != 'ANKI' ORDER BY created_at DESC").bind(user).all<MaterialRow>();return json({materials:rows.results.map(withMaterialLectureLinks)})}
export async function POST(request:Request){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to upload materials.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB||!env.BUCKET)return json({error:'Material storage is unavailable.'},503);
 if(Number(request.headers.get('content-length'))>29000000)return json({error:'Maximum file size is 25 MB.'},413);
 let form;try{form=await boundedForm(request,29000000)}catch(e){if(e instanceof RequestTooLarge)return json({error:'Upload request is too large.'},413);return json({error:'Use a supported document upload.'},400)}
 const file=form.get('file');if(!(file instanceof File)||file.size>25000000||file.size<1)return json({error:'Choose a file up to 25 MB.'},400);
 const lectureId=String(form.get('lectureId')||'');if(!lectureCourses.has(lectureId))return json({error:'Choose a known lecture.'},400);
 let parsed;const raw=String(form.get('extraction')||'');if(raw.length>8000000)return json({error:'Extracted text is too large; split the document.'},413);try{parsed=JSON.parse(raw)}catch{return json({error:'Document text could not be parsed.'},400)}
 if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.pages)||parsed.pages.length<1||parsed.pages.length>1200||parsed.pages.some((p:{page:number;text:string},i:number)=>!p||!Number.isInteger(p.page)||p.page!==i+1||typeof p.text!=='string'||p.text.length>100000))return json({error:'Invalid extracted pages.'},400);
 if(parsed.pack!==null&&parsed.pack!==undefined){const q=parsed.pack.questions;if(!Array.isArray(q)||!q.length||q.length>500||q.some((x:any)=>!x||typeof x.question!=='string'||!x.question.trim()||!lectureCourses.has(x.lectureId)||!Array.isArray(x.options)||x.options.length<2||x.options.length>8||x.options.some((v:unknown)=>typeof v!=='string'||!v.trim())||!Number.isInteger(x.answer)||x.answer<0||x.answer>=x.options.length||typeof x.explanation!=='string'||!x.explanation.trim()||!Array.isArray(x.reasons)||x.reasons.length!==x.options.length||x.reasons.some((v:unknown)=>typeof v!=='string'||!v.trim())))return json({error:'Invalid explained question pack.'},400)}
 const ext=file.name.toLowerCase().split('.').pop();
 if(!['pdf','txt','md','json','pptx','docx'].includes(ext||''))return json({error:'Use PDF, PPTX, DOCX, TXT, Markdown or a question-pack JSON file.'},400);
 if(ext==='pdf'&&!await hasPdfHeader(file)||['pptx','docx'].includes(ext||'')&&!await hasZipHeader(file))return json({error:'The file contents do not match its document type.'},400);
 const mime=ext==='pdf'?'application/pdf':ext==='json'?'application/json':['pptx','docx'].includes(ext||'')?'application/octet-stream':'text/plain';
 const bytes=await file.arrayBuffer(),sha=await digest(bytes);
 // A5-045: the account-scoped D1 listing and immutable built-in R2 match check
 // are independent; overlap them for ordinary uploads without weakening checks.
 // Handle D1 rejection immediately so early duplicate returns never leave an unhandled promise.
 const rowsPromise=materialRows(env.DB,user).then(rows=>({ok:true as const,rows}),error=>({ok:false as const,error}));
 const known=await knownOriginal(env.BUCKET,sha,bytes.byteLength);
 if(known&&form.get('attachKnown')!=='1')return json({duplicate:true,builtin:true,url:known.url,name:known.name});
 const candidates=await rowsPromise;if(!candidates.ok)throw candidates.error;
 const existing=await duplicateMaterial(env.BUCKET,user,candidates.rows.filter(row=>row.lectureId===lectureId),sha,bytes.byteLength);if(existing)return json({...withMaterialLectureLinks(existing),duplicate:true});
 const id=crypto.randomUUID(),base='materials/'+user+'/'+id,createdAt=new Date().toISOString();
 const quotaError=()=>json({error:'Your personal cloud storage is full (500 MB). Contact the site owner about space or remove unused cloud decks.'},413);
 if(!await withinPersonalQuota(env.DB,user,file.size))return quotaError();
 const name=file.name.slice(0,250),pageCount=parsed.pages.length;
 const submittedFigures=Array.isArray(parsed.figures)?parsed.figures:[];
 const figures=submittedFigures.filter((f:any)=>f&&Number.isInteger(f.page)&&f.page>0&&f.page<=pageCount&&typeof f.image==='string'&&f.image.length<200000&&/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(f.image)).slice(0,60);
 const clientOmitted=parsed.omittedFigures===undefined?0:parsed.omittedFigures;if(!Number.isSafeInteger(clientOmitted)||clientOmitted<0||clientOmitted>100000)return json({error:'Invalid omitted figure count.'},400);const omittedFigures=clientOmitted+submittedFigures.length-figures.length;
 try{
  if(known)await env.BUCKET.put(base+'/original-alias',JSON.stringify({key:known.key,sha,bytes:bytes.byteLength}),{httpMetadata:{contentType:'application/json'}});else await env.BUCKET.put(base+'/original',bytes,{httpMetadata:{contentType:mime},customMetadata:{sha256:sha}});
  await env.BUCKET.put(base+'/text',JSON.stringify({pages:parsed.pages,pack:parsed.pack||null,figures,omittedFigures}),{httpMetadata:{contentType:'application/json'}});
 }catch{
  await env.BUCKET.delete([base+'/original',base+'/original-alias',base+'/text']).catch(()=>{});
  return json({error:'Cloud material upload did not finish. Retry the upload.'},503);
 }
 try{
  if(!await reservePersonalUpload(env.DB,{id,user,name,lectureId,mime,bytes:file.size,pageCount,createdAt})){
   await env.BUCKET.delete([base+'/original',base+'/original-alias',base+'/text']).catch(()=>{});
   return quotaError();
  }
 }catch{
  // A database response can fail after a commit. Never remove objects if the row might exist.
  try{const committed=await env.DB.prepare('SELECT id FROM study_materials WHERE user_id=? AND id=?').bind(user,id).first();if(!committed)await env.BUCKET.delete([base+'/original',base+'/original-alias',base+'/text']);else return json(withMaterialLectureLinks({id,name,lectureId,mime,bytes:file.size,pageCount,createdAt,omittedFigures}))}catch{}
  return json({error:'Could not confirm the cloud material upload. Retry safely.'},503);
 }

 return json(withMaterialLectureLinks({id,name:file.name.slice(0,250),lectureId,mime,bytes:file.size,pageCount:parsed.pages.length,createdAt,omittedFigures}));
}
