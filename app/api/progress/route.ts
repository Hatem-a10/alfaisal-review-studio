import {readBounded,RequestTooLarge} from '../../../lib/bounded-request';
import {lectureCourses} from '../../../public/course-registry.mjs';
import {ProgressDelta} from '../../../lib/progress-delta';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const RESPONSE_HEADERS=Object.freeze({'Cache-Control':'no-store'});
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:RESPONSE_HEADERS});
export async function GET(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const accountKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 // Small authenticated revision check avoids loading unchanged multi-megabyte snapshots from D1/R2.
 const since=new URL(request.url).searchParams.get('since');
 const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();
 if(since!==null&&/^\d+$/.test(since)&&Number.isSafeInteger(Number(since))){
  const head=row;
  if(head&&head.revision===Number(since)){try{const pointer=JSON.parse(head.snapshot);if(pointer?.r2Snapshot&&(!env.BUCKET||!validPointer(pointer.r2Snapshot,id)||!await env.BUCKET.head(pointer.r2Snapshot)))throw Error('Snapshot missing');return json({revision:head.revision,updatedAt:head.updated_at,unchanged:true,acceptsPatch:true,accountKey})}catch{return json({error:'Cloud snapshot is unavailable. Your device copy is retained.'},503)}}
 }
 let snapshot;try{snapshot=row?await readSnapshot(row.snapshot,id):null}catch{return json({error:'Cloud snapshot is unavailable or damaged. Your device copy is retained; retry or contact support.'},503)}
 return json(row?{revision:row.revision,snapshot,updatedAt:row.updated_at,acceptsPatch:true,accountKey}:{revision:0,snapshot:null,acceptsPatch:true,accountKey});
}
export async function PUT(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 let raw:string;try{raw=new TextDecoder().decode(await readBounded(request,12000000))}catch(e){return json({error:e instanceof RequestTooLarge?'Progress backup is too large.':'Could not read progress data.'},e instanceof RequestTooLarge?413:400)}
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
 if(!Number.isSafeInteger(data?.revision)||data.revision<0||data.snapshot?.app!=='alfaisal-review-studio'||data.snapshot?.version!==2||!data.snapshot.records||Array.isArray(data.snapshot.records)||typeof data.snapshot.records!=='object'||Object.keys(data.snapshot.records).length>lectureCourses.size||!validSnapshot(data.snapshot))return json({error:'Invalid progress format.'},400);
 return writeSnapshot(id,data.revision,data.snapshot,undefined,true);
}
function validPointer(key:unknown,id:string):key is string{return typeof key==='string'&&key.startsWith('progress/'+id+'/')&&/^[0-9a-f-]{36}$/i.test(key.slice(('progress/'+id+'/').length))}
async function readSnapshot(raw:string,id:string){
 let snapshot=JSON.parse(raw);if(snapshot?.r2Snapshot){if(!env.BUCKET||!validPointer(snapshot.r2Snapshot,id))throw Error('Invalid snapshot reference');const obj=await env.BUCKET.get(snapshot.r2Snapshot);if(!obj)throw Error('Snapshot missing');snapshot=await new Response(obj.body).json()}
 if(!snapshot||snapshot.app!=='alfaisal-review-studio'||snapshot.version!==2||!snapshot.records||typeof snapshot.records!=='object'||Array.isArray(snapshot.records))throw Error('Invalid stored snapshot');
 return snapshot;
}
async function writeSnapshot(id:string,revision:number,data:any,prior?:any,validated=false){
 // A5-241: PUT and PATCH already validated the body. Recheck only if the
 // receipt-recovery merge changes its structure before persistence.
 let requiresValidation=!validated;
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 if(data.extras===undefined||!data.extras.stores.options?.value?.answerReceipts){
  try{const existing=prior===undefined?await env.DB.prepare('SELECT snapshot FROM study_snapshots WHERE user_id = ?').bind(id).first<{snapshot:string}>():null;const previous=prior??(existing?await readSnapshot(existing.snapshot,id):null);
   if(previous?.extras){if(data.extras===undefined){data.extras=previous.extras;requiresValidation=true;}else if(previous.extras.stores?.options?.value?.answerReceipts){const options=data.extras.stores.options;if(options?.value){options.value.answerReceipts=previous.extras.stores.options.value.answerReceipts;requiresValidation=true;}else if(!options){data.extras.stores.options=previous.extras.stores.options;requiresValidation=true;}}}
  }catch{return json({error:'Previous cloud data could not be read. Your device copy is retained.'},503)}
 }
 if(requiresValidation&&!validSnapshot(data))return json({error:'Invalid progress format.'},400);
 const content=JSON.stringify(data),at=new Date().toISOString(),size=new TextEncoder().encode(content).length;
 if(size>12000000)return json({error:'Combined progress backup is too large.'},413);
 let snapshot=content,r2Key:string|null=null;
 try{if(size>1500000){if(!env.BUCKET)return json({error:'Large snapshot storage is unavailable.'},503);r2Key='progress/'+id+'/'+crypto.randomUUID();await env.BUCKET.put(r2Key,content,{httpMetadata:{contentType:'application/json'}});snapshot=JSON.stringify({r2Snapshot:r2Key})}}catch{return json({error:'Cloud file saving failed. Your device copy is retained.'},503)}
 let result;
 try{
  if(revision===0)result=await env.DB.prepare('INSERT INTO study_snapshots (user_id, revision, snapshot, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(id,snapshot,at).run();
  else result=await env.DB.prepare('UPDATE study_snapshots SET snapshot = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(snapshot,at,id,revision).run();
 }catch{
  try{const current=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();if(current?.revision===revision+1&&current.snapshot===snapshot)return json({revision:current.revision,updatedAt:current.updated_at})}catch{}
  return json({error:'Cloud save could not be confirmed. Your device copy is retained; retry safely.'},503)
 }
 if(!result.meta.changes){if(r2Key)await env.BUCKET!.delete(r2Key).catch(()=>{});return json({error:'Cloud progress changed on another device. Choose which copy to keep.'},409)}
 return json({revision:revision+1,updatedAt:at});
}

type LearningEntry = {q:string;c:string;ok:boolean;choice:number;at:unknown};
type ProgressRecord = {title?:string;notes?:string;confidence?:number;difficult?:boolean;dates?:unknown[];done?:Record<string,unknown>;learning?:{results?:Record<string,LearningEntry>;read?:unknown[];attempts?:LearningEntry[]};resources?:unknown[];mcqs?:{id:string;total:number;correct:number;date:unknown;createdAt:unknown;source:string}[];sessions?:{startedAt:unknown;endedAt:unknown;seconds:number}[]};
type SnapshotWire = {extras?:{version:number;stores:Record<string,{at:string;value:unknown}>};settings?:{studentGroup:string;studentSection:string;groupConfigured:boolean;profileName:string;studentNumber:string;profileCreatedAt:string|null;labGroup:string;labGroupConfigured:boolean;englishFrequency:number;englishStartTime:string;onboardingDate:string|null;legacyProfile:boolean;englishEnabled:boolean;examNames:Record<string,unknown>;calendarColors:Record<string,unknown>;profilePhoto:string};records:Record<string,ProgressRecord>};
// Validate the same companion-store envelope as the client, without changing historical IDs.
function validCompanion(name:string,value:unknown):boolean{
 if(value===null)return true;
 const obj=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const stamp=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
 const question=(q:unknown)=>obj(q)&&typeof q.id==='string'&&typeof q.question==='string'&&Array.isArray(q.lectureIds)&&q.lectureIds.every((id:unknown)=>typeof id==='string')&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=8&&q.options.every((v:unknown)=>typeof v==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length&&typeof q.explanation==='string'&&Array.isArray(q.reasons)&&q.reasons.length===q.options.length;
 const run=(x:unknown)=>obj(x)&&Array.isArray(x.questions)&&x.questions.length>0&&x.questions.length<=200&&x.questions.every(question)&&obj(x.answers);
 if(name==='history')return Array.isArray(value)&&value.length<=100&&value.every(x=>obj(x)&&typeof x.id==='string'&&Number.isFinite(x.correct)&&Number.isFinite(x.total)&&x.correct>=0&&x.total>=x.correct);
 if(!obj(value))return false;
 if(name==='mock')return run(value)&&Number.isFinite(value.deadline)&&obj(value.flags)&&typeof value.id==='string';
 if(name==='practice')return !value.set||run(value.set);
 if(name==='wrongBank')return Array.isArray(value.entries)&&value.entries.every(x=>obj(x)&&question(x.question)&&(x.choice===null||Number.isInteger(x.choice)))&&Array.isArray(value.exams)&&value.exams.every((x:unknown)=>typeof x==='string');
 if(name==='drafts')return Object.values(value).every(x=>obj(x)&&Array.isArray(x.ids)&&Array.isArray(x.orders)&&obj(x.answers)&&obj(x.graded));
 if(name==='originals')return Object.values(value).every(x=>obj(x)&&Array.isArray(x.ids)&&x.ids.length<=800&&x.ids.every((id:unknown)=>typeof id==='string')&&obj(x.answers));
 if(name==='anki')return obj(value.cards)&&Object.entries(value.cards).every(([k,x])=>/^[a-f0-9]{64}:\d+$/.test(k)&&obj(x)&&Number.isFinite(x.due)&&Number.isFinite(x.interval)&&Number.isFinite(x.reps)&&(!x.at||stamp(x.at)));
 if(name==='queue')return obj(value.items)&&Object.values(value.items).every(x=>obj(x)&&typeof x.id==='string'&&Array.isArray(x.candidates)&&x.candidates.length<=500&&Array.isArray(x.scanned));
 if(name==='visual')return obj(value.exercises)&&obj(value.results);
 return true;
}
function validSnapshot(s: SnapshotWire): boolean {
 if(s.extras!==undefined){const e=s.extras;if(e?.version!==1||!e.stores||typeof e.stores!=='object'||Array.isArray(e.stores)||JSON.stringify(e).length>10000000)return false;const names=['wrongBank','history','mock','originals','drafts','resume','practice','queue','visual','anki','options'];for(const [k,v] of Object.entries(e.stores) as [string,{at:string;value:unknown}][]){if(!names.includes(k)||!v||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at))||JSON.stringify(v.value??null).length>7000000||!validCompanion(k,v.value??null))return false}}
 if(s.settings?.studentGroup!==undefined&&!['','M1','M2','F1','F2'].includes(s.settings.studentGroup))return false;
 if(s.settings?.studentSection!==undefined&&!['','A','B'].includes(s.settings.studentSection))return false;
 if(s.settings?.groupConfigured!==undefined&&typeof s.settings.groupConfigured!=='boolean')return false;
 if(s.settings?.profileName!==undefined&&(typeof s.settings.profileName!=='string'||s.settings.profileName.length>100))return false;
 if(s.settings?.studentNumber!==undefined&&(typeof s.settings.studentNumber!=='string'||s.settings.studentNumber.length>30))return false;
 if(s.settings?.profileCreatedAt!==undefined&&s.settings.profileCreatedAt!==null&&(typeof s.settings.profileCreatedAt!=='string'||!Number.isFinite(Date.parse(s.settings.profileCreatedAt))))return false;
 if(s.settings?.labGroupConfigured!==undefined&&typeof s.settings.labGroupConfigured!=='boolean')return false;
 if(s.settings?.labGroup!==undefined&&(typeof s.settings.labGroup!=='string'||s.settings.labGroup.length>30))return false;
 if(s.settings?.englishStartTime!==undefined&&!['17:00','17:30'].includes(s.settings.englishStartTime))return false;
 if(s.settings?.englishFrequency!==undefined&&![2,3].includes(s.settings.englishFrequency))return false;
 if(s.settings?.onboardingDate!==undefined&&s.settings.onboardingDate!==null&&(typeof s.settings.onboardingDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.settings.onboardingDate)||!Number.isFinite(Date.parse(s.settings.onboardingDate))||new Date(s.settings.onboardingDate).toISOString().slice(0,10)!==s.settings.onboardingDate))return false;
 if(s.settings?.legacyProfile!==undefined&&typeof s.settings.legacyProfile!=='boolean')return false;
 if(s.settings?.englishEnabled!==undefined&&typeof s.settings.englishEnabled!=='boolean')return false;
 if(s.settings?.examNames!==undefined&&(!s.settings.examNames||typeof s.settings.examNames!=='object'||Array.isArray(s.settings.examNames)||Object.keys(s.settings.examNames).length>64||Object.entries(s.settings.examNames).some(([k,v])=>!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(k)||typeof v!=='string'||!v.trim()||v.length>100)))return false;
 if(s.settings?.calendarColors!==undefined&&(!s.settings.calendarColors||typeof s.settings.calendarColors!=='object'||Array.isArray(s.settings.calendarColors)||Object.entries(s.settings.calendarColors).some(([k,v])=>!['anatomy','physiology','mol','lab','assessment','break','other','english'].includes(k)||typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))))return false;
 if(s.settings?.profilePhoto!==undefined&&(typeof s.settings.profilePhoto!=='string'||s.settings.profilePhoto.length>100000||(s.settings.profilePhoto!==''&&!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s.settings.profilePhoto))))return false;
 const stamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&stamp(v)&&new Date(v).toISOString().slice(0,10)===v;
 for(const [id,record] of Object.entries(s.records)){
  const course=lectureCourses.get(id);if(!course)return false;
  const r=record as ProgressRecord;if(!r||typeof r!=='object'||Array.isArray(r))return false;
  if(r.title!==undefined&&(typeof r.title!=='string'||r.title.length>300))return false;
  if(r.notes!==undefined&&(typeof r.notes!=='string'||r.notes.length>100000))return false;
  if(r.confidence!==undefined&&(!Number.isInteger(r.confidence)||r.confidence<0||r.confidence>5))return false;
  if(r.difficult!==undefined&&typeof r.difficult!=='boolean')return false;
  if(r.dates!==undefined&&(!Array.isArray(r.dates)||(r.dates.length!==3&&!(course.unscheduled&&r.dates.length===0))||r.dates.some((d:unknown)=>!date(d))))return false;
  if(r.done!==undefined){if(!r.done||typeof r.done!=='object'||Array.isArray(r.done))return false;for(const [p,t] of Object.entries(r.done))if(!['0','1','2'].includes(p)||(t!==null&&!stamp(t)))return false}
  if(r.learning!==undefined){const l=r.learning;if(l?.results!==undefined&&(!l.results||typeof l.results!=='object'||Array.isArray(l.results)||Object.keys(l.results).length>2000||Object.entries(l.results).some(([qid,t]:[string,LearningEntry])=>!qid||qid.length>180||!t||typeof t.c!=='string'||t.c.length>180||typeof t.ok!=='boolean'||!stamp(t.at))))return false;if(!l||typeof l!=='object'||Array.isArray(l))return false;if(l.read!==undefined&&(!Array.isArray(l.read)||l.read.length>300||l.read.some((v:unknown)=>typeof v!=='string'||v.length>160)))return false;if(l.attempts!==undefined&&(!Array.isArray(l.attempts)||l.attempts.length>200||l.attempts.some((t:LearningEntry)=>!t||typeof t.q!=='string'||t.q.length>180||typeof t.c!=='string'||t.c.length>180||typeof t.ok!=='boolean'||!Number.isInteger(t.choice)||t.choice<0||t.choice>8||!stamp(t.at))))return false;}
  if(r.resources!==undefined&&(!Array.isArray(r.resources)||r.resources.length>30||r.resources.some((u:unknown)=>typeof u!=='string'||u.length>3000||!/^https?:\/\//i.test(u))))return false;
  if(r.mcqs!==undefined&&(!Array.isArray(r.mcqs)||r.mcqs.length>5000||r.mcqs.some((q:NonNullable<ProgressRecord["mcqs"]>[number])=>!q||typeof q.id!=='string'||!Number.isInteger(q.total)||q.total<1||q.total>10000||!Number.isInteger(q.correct)||q.correct<0||q.correct>q.total||!date(q.date)||!stamp(q.createdAt)||typeof q.source!=='string'||q.source.length>200)))return false;
  if(r.sessions!==undefined&&(!Array.isArray(r.sessions)||r.sessions.length>5000||r.sessions.some((t:NonNullable<ProgressRecord["sessions"]>[number])=>!t||!stamp(t.startedAt)||!stamp(t.endedAt)||Date.parse(t.endedAt as string)<Date.parse(t.startedAt as string)||!Number.isInteger(t.seconds)||t.seconds<0||t.seconds>28800)))return false;
 }
 return true;
}

// CAS protects the read/apply/write sequence, including edits from older full-snapshot clients.
export async function PATCH(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 let raw:string;try{raw=new TextDecoder().decode(await readBounded(request,12000000))}catch(e){return json({error:e instanceof RequestTooLarge?'Patch is too large.':'Could not read progress data.'},e instanceof RequestTooLarge?413:400)}
 let body;try{body=JSON.parse(raw);if(!Number.isSafeInteger(body.revision)||body.revision<1)throw Error()}catch{return json({error:'Invalid patch format.'},400)}
 const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();
 if(!row||row.revision!==body.revision)return json({error:'Cloud progress changed.'},409);
 let prior;try{prior=await readSnapshot(row.snapshot,id)}catch{return json({error:'Cloud snapshot unavailable. Your device copy is retained.'},503)}
 let snapshot;try{snapshot=ProgressDelta.apply(prior,body.patch);if(!validSnapshot(snapshot))throw Error()}catch{return json({error:'Invalid progress patch.'},400)}
 return writeSnapshot(id,body.revision,snapshot,prior,true);
}
