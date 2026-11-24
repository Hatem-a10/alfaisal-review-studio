import {scheduleChanges} from './schedule-changes.mjs';
import {validateGroups} from './academic-config.mjs';

const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const DAYS=new Set(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
const TYPES=new Set(['lecture','lab','exam','tbl','deadline','english','other']);
const COURSES=new Set(['CVP','MOL 114','REN 123','FND','']);
const MAX=150000;
const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const label=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=120&&!/[<>\u0000-\u001f]/.test(v);
const cleanProfile=row=>{try{const p=JSON.parse(row?.profile_json||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{}}catch{return {}}};

export function validateAcademicConfig(config){
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).sort().join(',')!=='categories,events,groups')return 'Configuration must contain groups, events and categories.';
 if(!validateGroups(config.groups))return 'Academic group configuration is invalid.';
 if(!Array.isArray(config.categories)||config.categories.length>100)return 'Academic categories are invalid.';
 const categoryIds=new Set();
 for(const c of config.categories){if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join(',')!=='id,label'||!safeId(c.id)||!label(c.label)||categoryIds.has(c.id))return 'Academic categories contain an invalid or duplicate entry.';categoryIds.add(c.id)}
 if(!Array.isArray(config.events)||config.events.length>2000)return 'Academic events are invalid.';
 const ids=new Set(),events=[];
 for(const e of config.events){
  if(!e||typeof e!=='object'||Array.isArray(e))return 'An academic event is invalid.';
  const allowed=['id','title','type','date','day','startTime','endTime','studentGroup','studentSection','labGroup','course','lecturer','categoryId','replacesId','room'];
  if(Object.keys(e).some(k=>!allowed.includes(k))||!safeId(e.id)||ids.has(e.id)||!label(e.title)||!TYPES.has(e.type)||!time(e.startTime)||!time(e.endTime)||e.startTime>=e.endTime)return 'An academic event has invalid fields or time range.';
  ids.add(e.id);
  if(e.replacesId!==undefined&&(!safeId(e.replacesId)||e.replacesId===e.id))return 'An event replacement reference is invalid.';
  if((e.date!==undefined&&!date(e.date))||(e.day!==undefined&&!DAYS.has(e.day))||(!e.date&&!e.day))return 'Each event needs a valid date or weekday.';
  if(e.date&&e.day)return 'An event cannot use both a date and weekday.';
  if(e.studentGroup!==undefined&&!['M1','M2','F1','F2'].includes(e.studentGroup))return 'An event has an invalid academic group.';
  if(e.studentSection!==undefined&&!['A','B'].includes(e.studentSection))return 'An event has an invalid section.';
  if(e.labGroup!==undefined&&(typeof e.labGroup!=='string'||!/^\d{1,2}\.\d{1,2}$/.test(e.labGroup)))return 'An event has an invalid lab group.';
  if(e.labGroup!==undefined){const assigned=config.groups.some(g=>g.studentGroup===e.studentGroup&&g.studentSection===e.studentSection&&g.labGroups.includes(e.labGroup));if(!assigned)return 'Lab-group events must target a configured class, section and lab group.';}
  if(e.course!==undefined&&!COURSES.has(e.course))return 'An event has an invalid course.';
  if(e.lecturer!==undefined&&(!label(e.lecturer)||e.lecturer.length>100))return 'An event has an invalid lecturer.';
  if(e.room!==undefined&&(!label(e.room)||e.room.length>100))return 'An event has an invalid room.';
  if(e.categoryId!==undefined&&!categoryIds.has(e.categoryId))return 'An event references an unknown category.';
  events.push({...e,_day:e.date?new Date(e.date+'T12:00:00Z').getUTCDay():dayIndex(e.day)});
 }
 const clashes=new Set();
 for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
  const a=events[i],b=events[j];
  const aDay=a._day,bDay=b._day;
  const sameSlot=a.date&&b.date?a.date===b.date:aDay===bDay;
  const scoped=['studentGroup','studentSection','labGroup'].every(k=>a[k]===b[k]||(a[k]===undefined||b[k]===undefined));
  if(sameSlot&&scoped&&a.startTime<b.endTime&&b.startTime<a.endTime){clashes.add(a.id);clashes.add(b.id)}
 }
 if(clashes.size)return `Conflicting event times: ${[...clashes].join(', ')}.`;
 return null;
}
function dayIndex(value){return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(value)}

async function readBody(request){
 const length=Number(request.headers.get('content-length'));if(Number.isFinite(length)&&length>MAX)throw Object.assign(Error('Request too large.'),{status:413});
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('Request body is required.'),{status:400});let size=0,chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){reader.cancel().catch(()=>{});throw Object.assign(Error('Request too large.'),{status:413})}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw Object.assign(Error('Invalid JSON.'),{status:400})}
}
const dbError=()=>json({error:'Academic management is temporarily unavailable.'},503);
const revisionView=r=>({id:r.id,status:r.status,createdBy:r.created_by,createdAt:r.created_at,publishedAt:r.published_at,configuration:JSON.parse(r.configuration)});
function publishStatements(env,revision){
 const now=new Date().toISOString(),groups=revision.configuration.groups;
 const stmts=[env.DB.prepare('UPDATE review_academic_revisions SET status=\'published\',published_at=? WHERE id=? AND status=\'draft\'').bind(now,revision.id),
  env.DB.prepare('INSERT INTO review_academic_active(singleton,revision_id,changed_at) VALUES (1,?,?) ON CONFLICT(singleton) DO UPDATE SET revision_id=excluded.revision_id,changed_at=excluded.changed_at').bind(revision.id,now),
  env.DB.prepare('DELETE FROM review_academic_groups'),
  ...groups.map(g=>env.DB.prepare('INSERT INTO review_academic_groups(class_code,group_code,configuration) VALUES(?,?,?)').bind(g.studentGroup,g.studentSection,JSON.stringify({labGroups:g.labGroups})))];
 return {stmts,now};
}

// The Worker must gate this handler to the verified owner and a recent Admin Settings phrase check.
export async function academicAdmin({request,env,user,role,section,action,data,audit,mutate}){
 if(section!=='academics')return null;
 if(role!=='owner')return json({error:'Owner access required.'},403);
 if(!env?.DB)return dbError();
 try{
  if(request.method==='GET'&&action==='config'){
   const [active,draft,revisions]=await Promise.all([
    env.DB.prepare('SELECT r.* FROM review_academic_active a JOIN review_academic_revisions r ON r.id=a.revision_id WHERE a.singleton=1').first(),
    env.DB.prepare("SELECT * FROM review_academic_revisions WHERE status='draft' ORDER BY created_at DESC LIMIT 1").first(),
    env.DB.prepare('SELECT id,status,created_by,created_at,published_at FROM review_academic_revisions ORDER BY created_at DESC LIMIT 100').all()
   ]);
   return json({active:active?revisionView(active):null,draft:draft?revisionView(draft):null,revisions:revisions.results||[]});
  }
  if(request.method!=='POST'||!['save-draft','publish','rollback'].includes(action))return json({error:'Unsupported academic action.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
  const actionData=data===undefined?await readBody(request):data;
  if(!actionData||typeof actionData!=='object'||Array.isArray(actionData))return json({error:'Invalid request.'},400);
  if(action==='save-draft'){
   const reason=validateAcademicConfig(actionData.configuration);if(reason)return json({error:reason},400);
   const id=crypto.randomUUID(),now=new Date().toISOString(),draft={id,status:'draft',createdBy:user.id,createdAt:now,publishedAt:null,configuration:actionData.configuration};
   const stmts=[env.DB.prepare('INSERT INTO review_academic_revisions (id,configuration,status,created_by,created_at,published_at) VALUES (?,?,?,?,?,NULL)').bind(id,JSON.stringify(actionData.configuration),'draft',user.id,now)];
   if(mutate)await mutate(stmts,'academic.save-draft',id);else await env.DB.batch([...stmts,audit?.('academic.save-draft',id)].filter(Boolean));
   return json({draft});
  }
  const id=actionData.revisionId;if(!safeId(id))return json({error:'Revision not found.'},400);
  const source=await env.DB.prepare('SELECT * FROM review_academic_revisions WHERE id=?').bind(id).first();if(!source)return json({error:'Revision not found.'},404);
  const configuration=JSON.parse(source.configuration),reason=validateAcademicConfig(configuration);if(reason)return json({error:reason},409);
  if(action==='publish'&&source.status!=='draft')return json({error:'Only a draft can be published.'},409);
  if(action==='rollback'&&source.status!=='published')return json({error:'Rollback target must be a published revision.'},400);
  const now=new Date().toISOString(),revisionId=action==='rollback'?crypto.randomUUID():source.id;
  const revision={id:revisionId,status:'published',createdBy:action==='rollback'?user.id:source.created_by,createdAt:action==='rollback'?now:source.created_at,publishedAt:now,configuration};
  const stmts=[];
  if(action==='rollback')stmts.push(env.DB.prepare("INSERT INTO review_academic_revisions (id,configuration,status,created_by,created_at,published_at) VALUES (?,?,'published',?,?,?)").bind(revisionId,JSON.stringify(configuration),user.id,now,now));
  const projection=publishStatements(env,revision);stmts.push(...projection.stmts);
  const auditAction=action==='rollback'?'academic.rollback':'academic.publish';
  if(mutate)await mutate(stmts,auditAction,revisionId);else await env.DB.batch([...stmts,audit?.(auditAction,revisionId)].filter(Boolean));
  if(action==='rollback')return json({published:revision,rolledBackFrom:id});
  return json({published:revision});
 }catch(error){if(error?.status)return json({error:error.message},error.status);return dbError()}
}

// Called only after Worker authentication; account profile is read server-side, never from request JSON.
export async function academicStudent({request,env,user,row,path}){
 if(path!=='/api/control-center/student/academics')return null;
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 if(!user)return json({error:'Sign in required.'},401);
 if(!env?.DB)return dbError();
 try{
  const active=await env.DB.prepare('SELECT r.configuration,r.id,r.published_at FROM review_academic_active a JOIN review_academic_revisions r ON r.id=a.revision_id WHERE a.singleton=1').first();
  if(!active)return json({revisionId:null,groups:[],events:[],categories:[]});
  const config=JSON.parse(active.configuration);if(validateAcademicConfig(config))return dbError();const sourceProfile=row?.effectiveProfile&&typeof row.effectiveProfile==='object'?row.effectiveProfile:cleanProfile(row),profile={studentGroup:['M1','M2','F1','F2'].includes(sourceProfile.studentGroup)?sourceProfile.studentGroup:'',studentSection:['A','B'].includes(sourceProfile.studentSection)?sourceProfile.studentSection:'',labGroup:typeof sourceProfile.labGroup==='string'?sourceProfile.labGroup:''},group=profile.studentGroup,section=profile.studentSection,labGroup=profile.labGroup;
  const selected=config.events.filter(e=>(!e.studentGroup||e.studentGroup===group)&&(!e.studentSection||e.studentSection===section)&&(!e.labGroup||e.labGroup===labGroup));
  const groups=config.groups.filter(g=>g.studentGroup===group&&g.studentSection===section);
  let changes=[];
  if(active.published_at){
   const previous=await env.DB.prepare("SELECT configuration FROM review_academic_revisions WHERE id!=? AND status='published' AND published_at<=? ORDER BY published_at DESC,id DESC LIMIT 1").bind(active.id,active.published_at).first();
   if(previous){
    const old=JSON.parse(previous.configuration);
    if(!validateAcademicConfig(old))changes=scheduleChanges(old.events,config.events,profile,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh'}).format(new Date()));
   }
  }
  return json({revisionId:active.id,profile,groups,events:selected,categories:config.categories,changes});
 }catch{return dbError()}
}
