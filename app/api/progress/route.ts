import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();
 return json(row?{revision:row.revision,snapshot:JSON.parse(row.snapshot),updatedAt:row.updated_at}:{revision:0,snapshot:null});
}
export async function PUT(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);
 const raw=await request.text();if(raw.length>2000000)return json({error:'Progress backup is too large.'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
 if(!Number.isSafeInteger(data.revision)||data.revision<0||data.snapshot?.app!=='alfaisal-review-studio'||data.snapshot?.version!==2||!data.snapshot.records||Array.isArray(data.snapshot.records)||typeof data.snapshot.records!=='object'||Object.keys(data.snapshot.records).length>79||!validSnapshot(data.snapshot))return json({error:'Invalid progress format.'},400);
 const snapshot=JSON.stringify(data.snapshot),at=new Date().toISOString();let result;
 if(data.revision===0){result=await env.DB.prepare('INSERT INTO study_snapshots (user_id, revision, snapshot, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(id,snapshot,at).run()}
 else{result=await env.DB.prepare('UPDATE study_snapshots SET snapshot = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(snapshot,at,id,data.revision).run()}
 if(!result.meta.changes)return json({error:'Cloud progress changed on another device. Choose which copy to keep.'},409);
 return json({revision:data.revision+1,updatedAt:at});
}

function validSnapshot(s: any): boolean {
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
  if(r.learning!==undefined){const l=r.learning;if(!l||typeof l!=='object'||Array.isArray(l))return false;if(l.read!==undefined&&(!Array.isArray(l.read)||l.read.length>300||l.read.some((v:unknown)=>typeof v!=='string'||v.length>160)))return false;if(l.attempts!==undefined&&(!Array.isArray(l.attempts)||l.attempts.length>200||l.attempts.some((t:any)=>!t||typeof t.q!=='string'||t.q.length>180||typeof t.c!=='string'||t.c.length>180||typeof t.ok!=='boolean'||!Number.isInteger(t.choice)||t.choice<0||t.choice>8||!stamp(t.at))))return false;}
  if(r.resources!==undefined&&(!Array.isArray(r.resources)||r.resources.length>30||r.resources.some((u:unknown)=>typeof u!=='string'||u.length>3000||!/^https?:\/\//i.test(u))))return false;
  if(r.mcqs!==undefined&&(!Array.isArray(r.mcqs)||r.mcqs.length>5000||r.mcqs.some((q:any)=>!q||typeof q.id!=='string'||!Number.isInteger(q.total)||q.total<1||q.total>10000||!Number.isInteger(q.correct)||q.correct<0||q.correct>q.total||!date(q.date)||!stamp(q.createdAt)||typeof q.source!=='string'||q.source.length>200)))return false;
  if(r.sessions!==undefined&&(!Array.isArray(r.sessions)||r.sessions.length>5000||r.sessions.some((t:any)=>!t||!stamp(t.startedAt)||!stamp(t.endedAt)||!Number.isInteger(t.seconds)||t.seconds<0||t.seconds>28800)))return false;
 }
 return true;
}
