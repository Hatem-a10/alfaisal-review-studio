import {createClerkClient} from '@clerk/backend';
import {aggregateStudyCounts,verifyPanelPassword} from './managed-accounts.mjs';
import {VERIFIED_GROUPS} from '../public/verified-groups.mjs';

const base = '/api/control-center/';
const ownerSections = ['overview','students','roles','academics','resources','reports','announcements','analytics','storage','audit','site'];
const sections = {owner:ownerSections, editor:['overview','resources','reports'], moderator:['overview','reports','announcements']};
const defaultFlags = {readOnly:false, sharedUploads:true, reports:true, resourceLibrary:true, archiveCvp:true};
const classes = ['M1','M2','F1','F2'];
const sectionValues = ['A','B'];
const accountPattern = /^clerk:[a-f0-9]{64}:user_[a-zA-Z0-9_-]{1,123}$/;
const parse = (value, fallback = {}) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
export const adminResponse = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error = (message, status) => adminResponse({error:message},status);
const utc = () => new Date().toISOString();
const bounded = (input, max) => typeof input === 'string' ? input.trim().slice(0,max) : '';
const pageFor = params => Math.max(0,Math.min(10000,Number.parseInt(params.get('page'),10)||0));
const pageSize = 25;
const isMutation = request => !['GET','HEAD','OPTIONS'].includes(request.method);
const scoped = (user, id) => typeof id === 'string' && accountPattern.test(id) && id.slice(0,71) === user.id.slice(0,71);
const subject = id => id.split(':').at(-1);
const privateOwner = (env,id) => !!env.REVIEW_STUDIO_CLERK_OWNER_SUB && subject(id) === env.REVIEW_STUDIO_CLERK_OWNER_SUB;

export async function readAdminJSON(request, max=65536) {
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Expected JSON.');
 if (Number(request.headers.get('content-length')) > max || !request.body) throw new Error('Request too large or empty.');
 const reader = request.body.getReader();
 const decoder = new TextDecoder();
 let count = 0, value = '';
 for (;;) {
  const chunk = await reader.read();
  if (chunk.done) break;
  count += chunk.value.byteLength;
  if (count > max) { await reader.cancel(); throw new Error('Request too large.'); }
  value += decoder.decode(chunk.value,{stream:true});
 }
 return JSON.parse(value+decoder.decode());
}

export async function adminRole(db, user, row, owner) {
 if (!user || !row || !accountPattern.test(user.id) || (row.disabled && !owner)) return 'student';
 if (owner) return 'owner';
 const stored = await db.prepare('SELECT role FROM control_students WHERE account_id=?').bind(user.id).first();
 return ['editor','moderator'].includes(stored?.role) ? stored.role : 'student';
}

async function sessionHash(user) {
 const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.id+'\0'+user.sessionId));
 return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function rate(db, actor, bucket, limit, duration) {
 const window = Math.floor(Date.now()/duration);
 const result = await db.prepare(`INSERT INTO control_rate VALUES (?,?,?,1)
 ON CONFLICT(actor,bucket) DO UPDATE SET window=excluded.window, attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END
 WHERE window<>excluded.window OR attempts<? RETURNING attempts`).bind(actor,bucket,window,limit).first();
 return !!result;
}

// Admin overrides for when a course finishes (no more scheduled reviews after this date). Course code -> YYYY-MM-DD.
const courseCode=/^[A-Z][A-Z0-9]{1,9}$/, isoDay=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function cleanCourseEnds(value, strict=false){
 if(value===undefined||value===null)return {};
 if(typeof value!=='object'||Array.isArray(value)){if(strict)throw Object.assign(new Error('Check the course end dates.'),{status:400});return {};}
 const out={};
 for(const [course,date] of Object.entries(value).slice(0,24)){
  if(date===''||date===null)continue;
  if(courseCode.test(course)&&typeof date==='string'&&isoDay.test(date))out[course]=date;
  else if(strict)throw Object.assign(new Error('Check the course end dates.'),{status:400});
 }
 return out;
}

export async function controls(db) {
 const record = await db.prepare("SELECT value FROM control_settings WHERE key='site'").first();
 const value = parse(record?.value);
 const flags = Object.fromEntries(Object.entries(defaultFlags).map(([key, fallback])=>[key,typeof value[key]==='boolean'?value[key]:fallback]));
 return {...flags,maintenance:bounded(value.maintenance,300),courseEnds:cleanCourseEnds(value.courseEnds)};
}

export async function countControlEvent(db, kind) {
 if (!['sync-failed','upload-failed','application-error'].includes(kind) && !/^resource-open:[a-f0-9-]{36}$/i.test(kind)) return;
 await db.prepare(`INSERT INTO control_daily VALUES (?,?,1)
 ON CONFLICT(day,kind) DO UPDATE SET count=count+1`).bind(utc().slice(0,10),kind).run();
}

export function auditWriter(db, user, role) {
 const audit = (action,target='')=>db.prepare('INSERT INTO control_audit VALUES (?,?,?,?,?,?)').bind(
  crypto.randomUUID(),user.id,role,bounded(action,70),bounded(target,200),utc());
 const mutate = (statements,action,target)=>db.batch([
  ...statements,audit(action,target),
  db.prepare("DELETE FROM control_audit WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"),
 ]);
 return {audit,mutate};
}

function freshOwnerVerification(env,user) {
 if(env.REVIEW_STUDIO_OWNER_REAUTH==='1')return user.recentReauth===true;
 return env.REVIEW_STUDIO_OWNER_REQUIRE_MFA!=='1'||user.recentMfa===true;
}

export async function verifiedAdminChallenge(db, user, env={}) {
 if (!user?.sessionId||!freshOwnerVerification(env,user)) return false;
 const record = await db.prepare('SELECT expires FROM control_stepup WHERE session_hash=?').bind(await sessionHash(user)).first();
 return Number(record?.expires)>Date.now();
}

async function challenge(env,user,row,data,mutate) {
 const db=env.DB;
 if (!row.admin_panel_unlocked || !env.REVIEW_STUDIO_PANEL_PASSWORD_HASH) return error('Unlock Admin Settings first.',403);
 if (!await rate(db,user.id,'challenge',5,900000)) return error('Try again in 15 minutes.',429);
 if (!await verifyPanelPassword(data?.phrase,env.REVIEW_STUDIO_PANEL_PASSWORD_HASH)) {
  await mutate([],'security.challenge-failed');
  return error('Phrase could not be verified.',403);
 }
 if (!freshOwnerVerification(env,user)) {
  await mutate([],'security.reauth-required');
  // 428 tells the client to perform a fresh first-factor verification. It is
  // deliberately not a second-factor/MFA requirement.
  return env.REVIEW_STUDIO_OWNER_REAUTH==='1'
   ? adminResponse({error:'Confirm your identity with the code sent to your email.',reauthenticate:true},428)
   : error('Sign in again and verify your second factor in Clerk.',403);
 }
 const expires=Date.now()+600000;
 await mutate([
  db.prepare('DELETE FROM control_stepup WHERE expires<=?').bind(Date.now()),
  db.prepare('INSERT INTO control_stepup VALUES (?,?) ON CONFLICT(session_hash) DO UPDATE SET expires=excluded.expires').bind(await sessionHash(user),expires),
 ],'security.challenge-verified');
 return adminResponse({expires});
}

export async function accountControl(db, id) {
 const row = await db.prepare('SELECT assignment,reset_id FROM control_students WHERE account_id=?').bind(id).first();
 return {assignment:parse(row?.assignment,null),resetId:row?.reset_id||null};
}

export function adminWriteGate(path, method, flags) {
 if (['GET','HEAD','OPTIONS'].includes(method)) return null;
 if (!flags.sharedUploads && (path==='api/shared-decks'||path==='api/admin-assets/import'||path==='api/control-center/resources/upload')) return 'Shared uploads are paused.';
 if (!flags.reports && path==='api/control-center/student/reports') return 'Question reporting is paused.';
 if (flags.readOnly && /^(api\/(progress|materials|decks|shared-decks)(?:\/|$)|auth\/account$|api\/control-center\/student\/)/.test(path)) return 'Study data is read-only during maintenance. Your device copy is retained.';
 return null;
}

function effectiveGroup(row) {
 const profile={...parse(row.profile_json),...parse(row.assignment)};
 return {studentGroup:profile.studentGroup||'', studentSection:profile.studentSection||'', labGroup:profile.labGroup||''};
}

async function studentList(db, params, env) {
 const page=pageFor(params), search=bounded(params.get('q'),100).toLowerCase();
 const raw=params.get('cursor');let cursor=null;
 if(raw!==null){
  try{
   if(raw.length>512)throw Error('length');
   const value=JSON.parse(atob(raw));
   if(!Array.isArray(value)||value.length!==2||typeof value[0]!=='string'||value[0].length>40||!Number.isFinite(Date.parse(value[0]))||!accountPattern.test(value[1]))throw Error('shape');
   cursor=value;
  }catch{throw Object.assign(Error('Invalid student list cursor.'),{status:400})}
 }
 if(page>0&&!cursor)throw Object.assign(Error('Open the first page before navigating.'),{status:400});
 const group=bounded(params.get('class'),4), section=bounded(params.get('group'),2), lab=bounded(params.get('lab'),30);
 const status=params.get('status');
 const records=await db.prepare(`
 SELECT a.id,a.email,a.provider_name,a.created_at,a.last_seen_at,a.disabled,a.profile_json,s.role,s.assignment,s.reset_id
 FROM review_accounts a LEFT JOIN control_students s ON a.id=s.account_id
 WHERE (?='' OR instr(lower(a.email),?) OR instr(lower(a.provider_name),?) OR instr(lower(coalesce(json_extract(s.assignment,'$.name'),json_extract(a.profile_json,'$.name'))),?))
 AND (?='' OR coalesce(json_extract(s.assignment,'$.studentGroup'),json_extract(a.profile_json,'$.studentGroup'))=?)
 AND (?='' OR coalesce(json_extract(s.assignment,'$.studentSection'),json_extract(a.profile_json,'$.studentSection'))=?)
 AND (?='' OR coalesce(json_extract(s.assignment,'$.labGroup'),json_extract(a.profile_json,'$.labGroup'))=?)
 AND (?=-1 OR a.disabled=?)
 ${cursor?'AND (a.created_at < ? OR (a.created_at = ? AND a.id > ?))':''}
 ORDER BY a.created_at DESC,a.id LIMIT ?
 `).bind(search,search,search,search,group,group,section,section,lab,lab,
  status==='active'?0:status==='suspended'?1:-1,status==='suspended'?1:0,...(cursor?[cursor[0],cursor[0],cursor[1]]:[]),pageSize+1).all();
 const rows=records.results.slice(0,pageSize),more=records.results.length>pageSize,last=rows.at(-1);
 return {page,more,nextCursor:more&&last?btoa(JSON.stringify([last.created_at,last.id])):null, students:rows.map(row=>({
  id:row.id,name:parse(row.assignment).name||parse(row.profile_json).name||row.provider_name,email:row.email,
  createdAt:row.created_at,lastActive:row.last_seen_at,suspended:row.disabled===1,
  onboarding:row.reset_id?'reset requested':parse(row.profile_json).name?'complete':'pending',
  role:privateOwner(env,row.id)?'owner':row.role||'student',...effectiveGroup(row),
 }))};
}

async function studentStorage(db, bucket, id) {
 const row=await db.prepare('SELECT count(*) AS files,coalesce(sum(bytes),0) AS registeredBytes FROM study_materials WHERE user_id=?').bind(id).first();
 const progress=await db.prepare('SELECT length(CAST(snapshot AS BLOB)) AS bytes FROM study_snapshots WHERE user_id=?').bind(id).first();
 const prefixes=['materials/'+id+'/','progress/'+id+'/'];
 let objects=0,r2Bytes=0,partial=false;
 if (bucket) for (const prefix of prefixes) {
  let cursor;
  for(let page=0;page<4;page++){
   const listing=await bucket.list({prefix,cursor,limit:250});
   objects+=listing.objects.length;
   r2Bytes+=listing.objects.reduce((total,entry)=>total+entry.size,0);
   if (!listing.truncated) break;
   cursor=listing.cursor;
   if(page===3)partial=true;
  }
 }
 return {...row,progressRowBytes:progress?.bytes||0,r2Bytes:bucket?r2Bytes:null,objects:bucket?objects:null,partial};
}

async function revoke(env, id, mutate, clerk) {
 await mutate([],'student.sessions-revoke-requested',id);
 try {
  const api=clerk||createClerkClient({secretKey:env.CLERK_SECRET_KEY}).sessions;
  let revoked=0;
  for(let page=0;page<5;page++){
   const active=await api.getSessionList({userId:subject(id),status:'active',limit:100});
   if (!active.data.length) {
    await mutate([],'student.sessions-revoked',id);
    return adminResponse({revoked});
   }
   for (const session of active.data) {
    if (session.userId!==subject(id)) throw new Error('Provider scope mismatch.');
    await api.revokeSession(session.id);
    revoked++;
   }
   if(active.data.length<100){
    await mutate([],'student.sessions-revoked',id);
    return adminResponse({revoked});
   }
  }
  await mutate([],'student.sessions-revoke-partial',id);
  return adminResponse({revoked,partial:true});
 } catch {
  await mutate([],'student.sessions-revoke-failed',id);
  return error('Clerk could not confirm session revocation. Review audit and retry.',502);
 }
}

async function studentAdmin(ctx, params) {
 const {env,user,section,action,data,mutate}=ctx;
 const db=env.DB;
 if (action==='list' && ctx.request.method==='GET') return adminResponse(await studentList(db,params,env));
 const id=ctx.request.method==='GET'?params.get('id'):data?.id;
 if (!scoped(user,id)) return error('Choose a registered student.',400);
 const target=await db.prepare('SELECT id,disabled FROM review_accounts WHERE id=?').bind(id).first();
 if (!target) return error('Account not found.',404);
 if (action==='storage' && ctx.request.method==='GET') return adminResponse(await studentStorage(db,env.BUCKET,id));
 if (section==='students' && action==='details' && ctx.request.method==='GET'){
  if(!await rate(db,user.id,'student-details',40,60000))return error('Too many account lookups. Try again shortly.',429);
  const account=await db.prepare('SELECT profile_json,analytics_json FROM review_accounts WHERE id=?').bind(id).first();
  const {assignment}=await accountControl(db,id);
  const profile={...parse(account.profile_json),...assignment};
  const activeMinutes=parse(account.analytics_json).activeMinutes??null;
  await mutate([],'student.details-viewed',id);
  const provider=ctx.clerk||createClerkClient({secretKey:env.CLERK_SECRET_KEY});
  let photo=null,sessions=null;
  const [identity,history]=await Promise.allSettled([
   provider.users.getUser(subject(id)),
   provider.sessions.getSessionList({userId:subject(id),limit:10}),
  ]);
  if(identity.status==='fulfilled'&&identity.value.id===subject(id)&&identity.value.hasImage){
   try{const url=new URL(identity.value.imageUrl);if(url.origin==='https://img.clerk.com'&&!url.username&&!url.password)photo=url.href;}catch{}
  }
  if(history.status==='fulfilled'&&history.value.data.every(session=>session.userId===subject(id))){
   sessions=history.value.data.map(s=>({
    createdAt:Number.isFinite(s.createdAt)?s.createdAt:null,
    lastActiveAt:Number.isFinite(s.lastActiveAt)?s.lastActiveAt:null,
    browser:bounded(s.latestActivity?.browserName,60),
    device:bounded(s.latestActivity?.deviceType,60)||(s.latestActivity?.isMobile===true?'Mobile':''),
   }));
  }
  return adminResponse({photo,sessions,activeMinutes,
   profile:{name:profile.name||'',studentGroup:profile.studentGroup||'',studentSection:profile.studentSection||'',labGroup:profile.labGroup||'',
    englishFrequency:profile.englishFrequency||2,englishStartTime:profile.englishStartTime||'17:30',studentNumberOverride:assignment?.studentNumber||''}});
 }
 if (ctx.request.method!=='POST') return error('Method not allowed.',405);
 if (id===user.id || privateOwner(env,id)) return error('The owner account is protected.',403);
 if (section==='roles' && action==='set' && ['student','editor','moderator'].includes(data.role)) {
  await mutate([db.prepare('INSERT INTO control_students (account_id,role) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET role=excluded.role').bind(id,data.role)],'role.set.'+data.role,id);
 } else if (section==='students' && action==='suspend' && typeof data.suspended==='boolean') {
  await mutate([db.prepare('UPDATE review_accounts SET disabled=? WHERE id=?').bind(Number(data.suspended),id)],data.suspended?'student.suspended':'student.reactivated',id);
 } else if (section==='students' && action==='revoke') {
  return revoke(env,id,mutate,ctx.clerk);
 } else if (section==='students' && ['assignment','profile'].includes(action)) {
  const {studentGroup,studentSection,labGroup}=data;
  const unassigned=action==='profile'&&studentGroup===''&&studentSection===''&&labGroup==='';
  if (!unassigned&&(!classes.includes(studentGroup)||!sectionValues.includes(studentSection)||typeof labGroup!=='string')) return error('Choose a class and section.',400);
  if(labGroup){
   const custom=await db.prepare('SELECT configuration FROM review_academic_groups WHERE class_code=? AND group_code=?').bind(studentGroup,studentSection).first();
   const labs=custom?parse(custom.configuration).labGroups:VERIFIED_GROUPS.find(group=>group.studentGroup===studentGroup&&group.studentSection===studentSection)?.labGroups;
   if(!labs?.includes(labGroup))return error('Choose a verified lab group for this class and section.',400);
  }
  const assignment={studentGroup:unassigned?null:studentGroup,studentSection:unassigned?null:studentSection,labGroup:unassigned?null:labGroup};
  if(action==='profile'){
   const {name,studentNumber,englishFrequency,englishStartTime}=data;
   if(typeof name!=='string'||!name.trim()||name.length>100||/[\p{Cc}]/u.test(name)||
    typeof studentNumber!=='string'||!/^[A-Za-z0-9-]{0,30}$/.test(studentNumber)||
    ![2,3].includes(englishFrequency)||!['17:00','17:30'].includes(englishStartTime))return error('Check the name, student number and English schedule.',400);
   Object.assign(assignment,{name:name.trim(),studentNumber:studentNumber||null,englishFrequency,englishStartTime});
  }
  await mutate([db.prepare("INSERT INTO control_students (account_id,assignment) VALUES (?,json_patch('{}',?)) ON CONFLICT(account_id) DO UPDATE SET assignment=json_patch(coalesce(control_students.assignment,'{}'),?)").bind(id,JSON.stringify(assignment),JSON.stringify(assignment))],'student.'+action,id);
 } else if (section==='students' && action==='clear-assignment') {
  await mutate([db.prepare("UPDATE control_students SET assignment=nullif(json_remove(assignment,'$.studentGroup','$.studentSection','$.labGroup'),'{}') WHERE account_id=?").bind(id)],'student.assignment-cleared',id);
 } else if (section==='students' && action==='clear-profile') {
  await mutate([db.prepare('UPDATE control_students SET assignment=NULL WHERE account_id=?').bind(id)],'student.profile-cleared',id);
 } else if (section==='students' && action==='reset' && data.confirm==='RESET ONBOARDING') {
  await mutate([db.prepare('INSERT INTO control_students (account_id,reset_id) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET reset_id=excluded.reset_id').bind(id,crypto.randomUUID())],'student.onboarding-reset',id);
 } else return error('Unknown action or invalid values.',400);
 return adminResponse({saved:true});
}

function analyticsSummaryQuery(db){return db.prepare(`SELECT count(*) AS registered,
    coalesce(sum(last_seen_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')),0) AS active7,
    coalesce(sum(last_seen_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')),0) AS active30,
    coalesce(sum(length(coalesce(json_extract(profile_json,'$.name'),''))>0 AND reset_id IS NULL),0) AS onboarded,
    coalesce(sum(analytics_opt_in),0) AS sharing,
    coalesce(sum(CASE WHEN analytics_opt_in=1 THEN json_extract(analytics_json,'$.completedReviews') ELSE 0 END),0) AS completedReviews,
    coalesce(sum(CASE WHEN analytics_opt_in=1 THEN json_extract(analytics_json,'$.answeredQuestions') ELSE 0 END),0) AS answeredQuestions
    FROM review_accounts a LEFT JOIN control_students s ON s.account_id=a.id`)}
function suppressSmallGroupStudyTotals(summary){
 // Preserve the existing minimum-size privacy threshold for student study totals.
 if(summary.sharing<5){summary.completedReviews=null;summary.answeredQuestions=null}
 return summary;
}
async function overviewSummary(db){
 const response=await analyticsSummaryQuery(db).all();
 return suppressSmallGroupStudyTotals(response.results[0]);
}
async function usageAnalytics(db) {
 const [summary, activity, registrations, popularity, problems]=await db.batch([
  analyticsSummaryQuery(db),
  db.prepare("SELECT day,kind,count FROM control_daily WHERE day>=date('now','-29 days') AND kind NOT LIKE 'resource-open:%' ORDER BY day DESC"),
  db.prepare("SELECT substr(created_at,1,10) AS day,count(*) AS count FROM review_accounts WHERE created_at>=date('now','-29 days') GROUP BY day ORDER BY day DESC"),
  db.prepare(`SELECT r.title,sum(e.count) AS count FROM control_daily e
    JOIN admin_shared_resources r ON e.kind='resource-open:'||r.id
    WHERE e.day>=date('now','-29 days') GROUP BY r.id,r.title ORDER BY count DESC LIMIT 10`),
  db.prepare('SELECT category,count(*) AS count FROM review_question_reports GROUP BY category ORDER BY count DESC'),
 ]);
 const aggregate=suppressSmallGroupStudyTotals(summary.results[0]);
 return {summary:aggregate,activity:activity.results,registrations:registrations.results,popularity:popularity.results,problems:problems.results};
}

export async function controlRoute({request,env,user,row,handlers=[],clerk,owner=false,path}) {
 const url=new URL(request.url), name=path||url.pathname;
 if (!name.startsWith(base)) return null;
 if (!user || !row) return error('Sign in required.',401);
 if (row.disabled && !owner) return error('This account is suspended.',403);
 if (!['GET','POST'].includes(request.method)) return error('Method not allowed.',405);
 if (isMutation(request) && request.headers.get('origin')!==url.origin) return error('Invalid origin.',403);
 const [section,action='list',...rest]=name.slice(base.length).split('/');
 const db=env.DB;
 try {
  if (section==='student') {
   const flags=await controls(db);
   if(action==='status' && request.method==='GET') return adminResponse({flags,analyticsOptIn:row.analytics_opt_in===1,...await accountControl(db,user.id)});
   const blocked=adminWriteGate(name.slice(1),request.method,flags);
   if(blocked) return error(blocked,503);
   if(action==='reset-complete' && request.method==='POST') {
    const value=await readAdminJSON(request,1024);
    const result=await db.prepare('UPDATE control_students SET reset_id=NULL WHERE account_id=? AND reset_id=?').bind(user.id,bounded(value?.resetId,80)).run();
    return result.meta?.changes?adminResponse({saved:true}):error('Onboarding request changed.',409);
   }
   if(action==='study-counts' && request.method==='POST'){
    const value=await readAdminJSON(request,1024);
    if(!row.analytics_opt_in)return adminResponse({accepted:false});
    if(!value || !Object.values(value).every(Number.isFinite))return error('Invalid study totals.',400);
    if(!await rate(db,user.id,'study-counts',20,3600000))return error('Try again later.',429);
    await db.prepare('UPDATE review_accounts SET analytics_json=json_patch(analytics_json,?) WHERE id=? AND analytics_opt_in=1').bind(JSON.stringify(aggregateStudyCounts(value)),user.id).run();
    return adminResponse({accepted:true});
   }
   if(action==='active-minute' && request.method==='POST'){
    const minute=Math.floor(Date.now()/60000);
    await db.prepare("UPDATE review_accounts SET analytics_json=json_set(analytics_json,'$.activeMinutes',coalesce(json_extract(analytics_json,'$.activeMinutes'),0)+1,'$.lastActiveMinute',?) WHERE id=? AND coalesce(json_extract(analytics_json,'$.lastActiveMinute'),0) < ?").bind(minute,user.id,minute).run();
    return adminResponse({accepted:true});
   }
   if(action==='telemetry' && request.method==='POST'){
    const value=await readAdminJSON(request,1024);
    if(value?.kind!=='application-error')return error('Unknown event.',400);
    if(await rate(db,user.id,'telemetry',20,86400000)) await countControlEvent(db,'application-error');
    return adminResponse({accepted:true},202);
   }
   if (!flags.resourceLibrary && action==='resources') return error('The shared library is paused.',503);
   const {assignment}=await accountControl(db,user.id);
   for (const handler of handlers){const result=await handler({request,env,user,row:{...row,effectiveProfile:{...parse(row.profile_json),...assignment}},path:name}); if(result)return result;}
   return error('Action not found.',404);
  }

  if (rest.length) return error('Action not found.',404);
  const role=await adminRole(db,user,row,owner);
  if (!sections[role]) return error('Administrator access required.',403);
  if (section==='access' && request.method==='GET') return adminResponse({role,sections:sections[role],unlocked:role!=='owner'||row.admin_panel_unlocked===1});
  if (role==='owner' && row.admin_panel_unlocked!==1) return error('Unlock Admin Settings first.',403);
  if (!sections[role].includes(section) && section!=='challenge') return error('This role cannot access that section.',403);

  const {audit,mutate}=auditWriter(db,user,role);
  let data=null;
  if(request.method==='POST'){
   if(section==='challenge' && role!=='owner')return error('Owner access required.',403);
   if(section!=='challenge' && role==='owner' && !await verifiedAdminChallenge(db,user,env)) return adminResponse({error:'Confirm the Admin phrase to continue.',challenge:true},428);
   if(section!=='challenge' && !await rate(db,user.id,'write',30,60000)) return error('Too many changes. Try again shortly.',429);
   if (!request.headers.get('content-type')?.startsWith('multipart/form-data')){
    try {data=await readAdminJSON(request);}catch {return error('Invalid or oversized request.',400);}
   }
  }
  const ctx={request,env,user,row,role,section,action,data,audit,mutate,clerk};
  const params=url.searchParams;
  if(section==='challenge' && request.method==='POST')return challenge(env,user,row,data,mutate);
  if(section==='overview' && request.method==='GET'){
   const flags=await controls(db);
   const summary=role==='owner'?await overviewSummary(db):undefined;
   return adminResponse({role,flags,summary,environment:env.REVIEW_STUDIO_DEPLOYMENT});
  }
  if(section==='students'||section==='roles')return await studentAdmin(ctx,params);
  if(section==='audit' && request.method==='GET'){
   const page=pageFor(params),roleFilter=bounded(params.get('role'),20),actionFilter=bounded(params.get('action'),80).toLowerCase(),term=bounded(params.get('q'),100).toLowerCase(),from=bounded(params.get('from'),10),to=bounded(params.get('to'),10);
   if(roleFilter&&!['owner','editor','moderator'].includes(roleFilter)||actionFilter&&!/^[a-z0-9_.:-]+$/.test(actionFilter)||from&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(from)||to&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(to)||from&&to&&from>to)return error('Invalid audit filters.',400);
   const conditions=["created_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"],bindings=[];
   if(roleFilter){conditions.push('role=?');bindings.push(roleFilter)}
   if(actionFilter){conditions.push('lower(action) LIKE ?');bindings.push(actionFilter+'%')}
   if(term){conditions.push('(instr(lower(actor),?)>0 OR instr(lower(target),?)>0 OR instr(lower(action),?)>0)');bindings.push(term,term,term)}
   if(from){conditions.push('created_at>=?');bindings.push(from+'T00:00:00.000Z')}
   if(to){conditions.push('created_at<?');bindings.push(new Date(Date.parse(to+'T00:00:00Z')+86400000).toISOString())}
   const rows=await db.prepare('SELECT id,actor,role,action,target,created_at FROM control_audit WHERE '+conditions.join(' AND ')+' ORDER BY created_at DESC,id LIMIT ? OFFSET ?').bind(...bindings,pageSize+1,page*pageSize).all();
   return adminResponse({entries:rows.results.slice(0,pageSize),page,more:rows.results.length>pageSize});
  }
  if(section==='analytics'&&action==='health'&&request.method==='GET'){
   if(role!=='owner')return error('Owner access required.',403);
   const seenAt=new Date().toISOString();
   let database='unavailable',storage='unavailable';
   try{const record=await db.prepare('SELECT 1 AS ok').first();if(record?.ok===1)database='reachable';}catch{}
   if(env.BUCKET?.list)try{await env.BUCKET.list({prefix:'__health_probe_read_only__/',limit:1});storage='reachable';}catch{storage='unavailable'}
   let errorCounts=null;
   try{
    const result=await db.prepare("SELECT day,kind,count FROM control_daily WHERE day>=date('now','-6 days') AND kind IN ('application-error','sync-failed','upload-failed') ORDER BY day,kind").all();
    errorCounts=(result.results||[]).map(x=>({day:x.day,kind:x.kind,count:Number(x.count||0)}));
   }catch{}
   return adminResponse({checkedAt:seenAt,environment:env.REVIEW_STUDIO_DEPLOYMENT||'unknown',database,storage,clerkSession:'verified for this request',errorCounters:errorCounts,limits:'R2 list and D1 read only; not a full restore or end-user latency check.',cpu:'not instrumented'});
  }
  if(section==='analytics' && request.method==='GET'){
   // All five independent read-only aggregate statements execute in one D1 batch.
   return adminResponse(await usageAnalytics(db));
  }
  if(section==='site'){
   if(request.method==='GET') return adminResponse({flags:await controls(db),environment:env.REVIEW_STUDIO_DEPLOYMENT,database:!!db,storage:!!env.BUCKET});
   if(action==='save'){
    if(!data || Object.keys(defaultFlags).some(key=>(key!=='archiveCvp'||data[key]!==undefined)&&typeof data[key]!=='boolean') || typeof data.maintenance!=='string' || data.maintenance.length>300)return error('Check the feature settings and maintenance message.',400);
    const previous=await controls(db);
    await mutate([db.prepare("INSERT INTO control_settings VALUES ('site',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({...Object.fromEntries(Object.keys(defaultFlags).map(key=>[key,data[key]??previous[key]])),maintenance:data.maintenance.trim(),courseEnds:data.courseEnds===undefined?previous.courseEnds:cleanCourseEnds(data.courseEnds,true)}))],'site.settings');
    return adminResponse({saved:true});
   }
  }
  if(section==='resources' && request.method==='POST'){
   const flags=await controls(db);
   if(!flags.sharedUploads && ['upload','replace'].includes(action))return error('Shared uploads are paused.',503);
  }
  for (const handler of handlers){const result=await handler(ctx); if(result)return result;}
  return error('Action not found.',404);
 } catch (cause) {
  // Never return SQL/provider errors or request data to a browser.
  if(cause?.status>=400 && cause.status<500)return error(cause.message,cause.status);
  return error('Control Center is temporarily unavailable.',503);
 }
}
