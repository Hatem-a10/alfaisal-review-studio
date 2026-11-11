import {ProgressDelta} from '../../../lib/progress-delta';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const accountKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 // Small authenticated revision check avoids loading unchanged multi-megabyte snapshots from D1/R2.
 const since=new URL(request.url).searchParams.get('since');
 if(since!==null&&/^\d+$/.test(since)&&Number.isSafeInteger(Number(since))){
  const head=await env.DB.prepare('SELECT revision, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;updated_at:string}>();
  if(head&&head.revision===Number(since))return json({revision:head.revision,updatedAt:head.updated_at,unchanged:true,acceptsPatch:true,accountKey});
 }
 const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();
 let snapshot=row?JSON.parse(row.snapshot):null;if(snapshot?.r2Snapshot){if(!env.BUCKET)return json({error:'Cloud file storage is unavailable.'},503);const obj=await env.BUCKET.get(snapshot.r2Snapshot);if(!obj)return json({error:'Cloud snapshot is unavailable. Your device copy is retained.'},503);snapshot=await new Response(obj.body).json()}
 return json(row?{revision:row.revision,snapshot,updatedAt:row.updated_at,acceptsPatch:true,accountKey}:{revision:0,snapshot:null,acceptsPatch:true,accountKey});
}
export async function PUT(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const raw=await request.text();if(raw.length>12000000)return json({error:'Progress backup is too large.'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
 if(!Number.isSafeInteger(data.revision)||data.revision<0||data.snapshot?.app!=='alfaisal-review-studio'||data.snapshot?.version!==2||!data.snapshot.records||Array.isArray(data.snapshot.records)||typeof data.snapshot.records!=='object'||Object.keys(data.snapshot.records).length>79||!validSnapshot(data.snapshot))return json({error:'Invalid progress format.'},400);
 // Older open tabs may still send the v2 core-only bundle. Retain newer companion stores.
 if(data.snapshot.extras===undefined||!data.snapshot.extras.stores.options?.value?.answerReceipts){const existing=await env.DB.prepare('SELECT snapshot FROM study_snapshots WHERE user_id = ?').bind(id).first<{snapshot:string}>();if(existing){let previous=JSON.parse(existing.snapshot);if(previous?.r2Snapshot&&env.BUCKET){const object=await env.BUCKET.get(previous.r2Snapshot);if(object)previous=await new Response(object.body).json()}if(previous?.extras){if(data.snapshot.extras===undefined)data.snapshot.extras=previous.extras;else if(previous.extras.stores?.options?.value?.answerReceipts){const options=data.snapshot.extras.stores.options;if(options?.value)options.value.answerReceipts=previous.extras.stores.options.value.answerReceipts;else if(!options)data.snapshot.extras.stores.options=previous.extras.stores.options}}}}
 const content=JSON.stringify(data.snapshot),at=new Date().toISOString();let snapshot=content,r2Key:string|null=null;if(new TextEncoder().encode(content).length>1500000){if(!env.BUCKET)return json({error:'Large snapshot storage is unavailable.'},503);r2Key='progress/'+id+'/'+crypto.randomUUID();await env.BUCKET.put(r2Key,content,{httpMetadata:{contentType:'application/json'}});snapshot=JSON.stringify({r2Snapshot:r2Key})}let result;
 if(data.revision===0){result=await env.DB.prepare('INSERT INTO study_snapshots (user_id, revision, snapshot, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(id,snapshot,at).run()}
 else{result=await env.DB.prepare('UPDATE study_snapshots SET snapshot = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(snapshot,at,id,data.revision).run()}
 if(!result.meta.changes){if(r2Key)await env.BUCKET!.delete(r2Key);return json({error:'Cloud progress changed on another device. Choose which copy to keep.'},409)}
 return json({revision:data.revision+1,updatedAt:at});
}

function validSnapshot(s: any): boolean {
 if(s.extras!==undefined){const e=s.extras;if(e?.version!==1||!e.stores||typeof e.stores!=='object'||Array.isArray(e.stores)||JSON.stringify(e).length>10000000)return false;const names=['wrongBank','history','mock','originals','drafts','resume','practice','queue','visual','anki','options'];for(const [k,v] of Object.entries(e.stores) as [string,any][]){if(!names.includes(k)||!v||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at))||JSON.stringify(v.value??null).length>7000000)return false}}
 if(s.settings?.profileName!==undefined&&(typeof s.settings.profileName!=='string'||s.settings.profileName.length>100))return false;
 if(s.settings?.studentNumber!==undefined&&(typeof s.settings.studentNumber!=='string'||s.settings.studentNumber.length>30))return false;
 if(s.settings?.profileCreatedAt!==undefined&&s.settings.profileCreatedAt!==null&&(typeof s.settings.profileCreatedAt!=='string'||!Number.isFinite(Date.parse(s.settings.profileCreatedAt))))return false;
 if(s.settings?.legacyProfile!==undefined&&typeof s.settings.legacyProfile!=='boolean')return false;
 if(s.settings?.englishEnabled!==undefined&&typeof s.settings.englishEnabled!=='boolean')return false;
 if(s.settings?.examNames!==undefined&&(!s.settings.examNames||typeof s.settings.examNames!=='object'||Array.isArray(s.settings.examNames)||Object.keys(s.settings.examNames).length>64||Object.entries(s.settings.examNames).some(([k,v])=>!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(k)||typeof v!=='string'||!v.trim()||v.length>100)))return false;
 if(s.settings?.calendarColors!==undefined&&(!s.settings.calendarColors||typeof s.settings.calendarColors!=='object'||Array.isArray(s.settings.calendarColors)||Object.entries(s.settings.calendarColors).some(([k,v])=>!['anatomy','physiology','mol','lab','assessment','break','other','english'].includes(k)||typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))))return false;
 if(s.settings?.profilePhoto!==undefined&&(typeof s.settings.profilePhoto!=='string'||s.settings.profilePhoto.length>100000||(s.settings.profilePhoto!==''&&!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s.settings.profilePhoto))))return false;
 const stamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&stamp(v)&&new Date(v).toISOString().slice(0,10)===v;
 for(const [id,record] of Object.entries(s.records)){
  const m=/^(CVP-([PA])|MOL-)(\d+)$/.exec(id);if(!m)return false;const n=Number(m[3]);if(n<1||n>(m[2]==='A'?23:28))return false;
  const r=record as any;if(!r||typeof r!=='object'||Array.isArray(r))return false;
  if(r.title!==undefined&&(typeof r.title!=='string'||r.title.length>300))return false;
  if(r.notes!==undefined&&(typeof r.notes!=='string'||r.notes.length>100000))return false;
  if(r.confidence!==undefined&&(!Number.isInteger(r.confidence)||r.confidence<0||r.confidence>5))return false;
  if(r.difficult!==undefined&&typeof r.difficult!=='boolean')return false;
  if(r.dates!==undefined&&(!Array.isArray(r.dates)||r.dates.length!==3||r.dates.some((d:unknown)=>!date(d))))return false;
  if(r.done!==undefined){if(!r.done||typeof r.done!=='object'||Array.isArray(r.done))return false;for(const [p,t] of Object.entries(r.done))if(!['0','1','2'].includes(p)||(t!==null&&!stamp(t)))return false}
  if(r.learning!==undefined){const l=r.learning;if(l?.results!==undefined&&(!l.results||typeof l.results!=='object'||Array.isArray(l.results)||Object.keys(l.results).length>2000||Object.entries(l.results).some(([qid,t]:[string,any])=>!qid||qid.length>180||!t||typeof t.c!=='string'||t.c.length>180||typeof t.ok!=='boolean'||!stamp(t.at))))return false;if(!l||typeof l!=='object'||Array.isArray(l))return false;if(l.read!==undefined&&(!Array.isArray(l.read)||l.read.length>300||l.read.some((v:unknown)=>typeof v!=='string'||v.length>160)))return false;if(l.attempts!==undefined&&(!Array.isArray(l.attempts)||l.attempts.length>200||l.attempts.some((t:any)=>!t||typeof t.q!=='string'||t.q.length>180||typeof t.c!=='string'||t.c.length>180||typeof t.ok!=='boolean'||!Number.isInteger(t.choice)||t.choice<0||t.choice>8||!stamp(t.at))))return false;}
  if(r.resources!==undefined&&(!Array.isArray(r.resources)||r.resources.length>30||r.resources.some((u:unknown)=>typeof u!=='string'||u.length>3000||!/^https?:\/\//i.test(u))))return false;
  if(r.mcqs!==undefined&&(!Array.isArray(r.mcqs)||r.mcqs.length>5000||r.mcqs.some((q:any)=>!q||typeof q.id!=='string'||!Number.isInteger(q.total)||q.total<1||q.total>10000||!Number.isInteger(q.correct)||q.correct<0||q.correct>q.total||!date(q.date)||!stamp(q.createdAt)||typeof q.source!=='string'||q.source.length>200)))return false;
  if(r.sessions!==undefined&&(!Array.isArray(r.sessions)||r.sessions.length>5000||r.sessions.some((t:any)=>!t||!stamp(t.startedAt)||!stamp(t.endedAt)||!Number.isInteger(t.seconds)||t.seconds<0||t.seconds>28800)))return false;
 }
 return true;
}

// CAS protects the read/apply/write sequence, including edits from older full-snapshot clients.
export async function PATCH(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const raw=await request.text();if(raw.length>12000000)return json({error:'Patch is too large.'},413);
 let body;try{body=JSON.parse(raw);if(!Number.isSafeInteger(body.revision)||body.revision<1)throw Error()}catch{return json({error:'Invalid patch format.'},400)}
 const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();
 if(!row||row.revision!==body.revision)return json({error:'Cloud progress changed.'},409);
 let prior=JSON.parse(row.snapshot);if(prior?.r2Snapshot){if(!env.BUCKET)return json({error:'Cloud storage unavailable.'},503);const file=await env.BUCKET.get(prior.r2Snapshot);if(!file)return json({error:'Snapshot unavailable.'},503);prior=await new Response(file.body).json()}
 let snapshot;try{snapshot=ProgressDelta.apply(prior,body.patch);if(!validSnapshot(snapshot))throw Error()}catch{return json({error:'Invalid progress patch.'},400)}
 return PUT(new Request(request.url,{method:'PUT',headers:request.headers,body:JSON.stringify({revision:body.revision,snapshot})}));
}
