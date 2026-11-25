import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {adminWriteGate,controlRoute} from '../lib/admin-control.mjs';

const origin='https://staging.example';
const prefix='clerk:'+'a'.repeat(64)+':';
const owner={id:prefix+'user_owner',sessionId:'owner-session'};
const editor={id:prefix+'user_editor',sessionId:'editor-session'};
const student={id:prefix+'user_student',sessionId:'student-session'};
const moderator={id:prefix+'user_moderator',sessionId:'mod-session'};
const phrase='test phrase used only locally';

function harness() {
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['staging/managed-accounts.sql','staging/schema.sql','staging/admin-control.sql','staging/admin-content.sql','staging/admin-resources.sql',
  'drizzle/0000_huge_gladiator.sql','drizzle/0001_purple_norman_osborn.sql'])sqlite.exec(readFileSync(file,'utf8'));
 function stmt(sql,params=[]){
  return {sql,params,bind:(...args)=>stmt(sql,args),
   first:async()=>sqlite.prepare(sql).get(...params)??null,
   all:async()=>({results:sqlite.prepare(sql).all(...params)}),
   run:async()=>({meta:sqlite.prepare(sql).run(...params)}),
  };
 }
 const DB={prepare:stmt,batch:async statements=>{
  sqlite.exec('BEGIN');
  try{
   const results=[];
   for(const statement of statements)results.push(await (/^SELECT\b/i.test(statement.sql.trim())?statement.all():statement.run()));
   sqlite.exec('COMMIT');
   return results;
  }catch(error){sqlite.exec('ROLLBACK');throw error;}
 }};
 const salt=Buffer.alloc(16,1);
 const digest=pbkdf2Sync(phrase,salt,100000,32,'sha256').toString('hex');
 const env={DB,REVIEW_STUDIO_DEPLOYMENT:'staging',REVIEW_STUDIO_CLERK_OWNER_SUB:'user_owner',
  REVIEW_STUDIO_PANEL_PASSWORD_HASH:'pbkdf2-sha256$100000$'+salt.toString('hex')+'$'+digest};
 for(const [account,email,profile] of [[owner,'owner@example.test',{}],[editor,'editor@example.test',{}],
  [student,'student@example.test',{name:'Student Example',studentGroup:'M2',studentSection:'A',labGroup:'2.1'}],[moderator,'mod@example.test',{}]]){
  sqlite.prepare('INSERT INTO review_accounts(id,email,created_at,last_seen_at,profile_json) VALUES (?,?,?,?,?)').run(account.id,email,new Date().toISOString(),new Date().toISOString(),JSON.stringify(profile));
 }
 sqlite.prepare('UPDATE review_accounts SET admin_panel_unlocked=1 WHERE id=?').run(owner.id);
 sqlite.prepare('INSERT INTO control_students (account_id,role) VALUES (?,?)').run(editor.id,'editor');
 sqlite.prepare('INSERT INTO control_students (account_id,role) VALUES (?,?)').run(moderator.id,'moderator');
 const account = id=>sqlite.prepare('SELECT * FROM review_accounts WHERE id=?').get(id);
 const call=(path, actor, data, options={})=>{
  const request=new Request(origin+'/api/control-center/'+path,{
   method:data===undefined?'GET':'POST',
   headers:{...(data===undefined?{}:{origin,'Content-Type':'application/json'}),...options.headers},
   body:data===undefined?undefined:JSON.stringify(data),
  });
  return controlRoute({request,env,user:actor,row:actor&&account(actor.id),owner:actor?.id===owner.id,handlers:options.handlers,clerk:options.clerk});
 };
 return {env,sqlite,call,challenge:()=>call('challenge',owner,{phrase})};
}

test('anonymous and forged roles cannot read student records, editor and moderator grants are checked server-side',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 assert.equal((await h.call('students')).status,401);
 assert.equal((await h.call('students',student,undefined,{headers:{'x-review-studio-owner':'1','x-role':'owner'}})).status,403);
 const edit=await (await h.call('access',editor)).json();
 assert.deepEqual(edit.sections,['overview','resources','reports']);
 assert.equal((await h.call('storage/summary',editor)).status,403);
 assert.equal((await h.call('resources/list',moderator)).status,403);
 assert.equal((await h.call('roles/set',editor,{id:student.id,role:'editor'})).status,403);
 assert.equal((await h.call('challenge',student,{phrase})).status,403);
 assert.equal((await h.call('challenge',moderator,{phrase})).status,403);
 assert.equal((await h.call('students',owner,undefined)).status,200);
});

test('owner changes need the verified session challenge, respect origin, protect the owner and audit suspension and grant changes',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 assert.equal((await h.call('students/suspend',owner,{id:student.id,suspended:true})).status,428);
 assert.equal((await h.call('challenge',owner,{phrase},{headers:{origin:'https://other.example'}})).status,403);
 assert.equal((await h.challenge()).status,200);
 assert.equal((await h.call('students/suspend',{...owner,sessionId:'new-session'},{id:student.id,suspended:true})).status,428);
 assert.equal((await h.call('roles/set',owner,{id:owner.id,role:'student'})).status,403);
 assert.equal((await h.call('students/suspend',owner,{id:owner.id,suspended:true})).status,403);
 assert.equal((await h.call('students/suspend',owner,{id:student.id,suspended:true})).status,200);
 assert.equal((await h.call('student/status',student)).status,403);
 assert.equal((await h.call('students/suspend',owner,{id:student.id,suspended:false})).status,200);
 assert.equal((await h.call('student/status',student)).status,200);
 assert.equal((await h.call('roles/set',owner,{id:student.id,role:'editor'})).status,200);
 assert.equal((await (await h.call('access',student)).json()).role,'editor');
 const body=await (await h.call('audit',owner)).json();
 assert.ok(body.entries.find(e=>e.action==='student.suspended'&&e.target===student.id));
 assert.ok(body.entries.find(e=>e.action==='role.set.editor'));
 assert.doesNotMatch(JSON.stringify(body),new RegExp(phrase+'|owner-session|student@example'));
});

test('production owner step-up requires recent first-factor reauthentication, not MFA at sign-in',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 h.env.REVIEW_STUDIO_OWNER_REAUTH='1';
 assert.equal((await h.call('challenge',owner,{phrase})).status,428);
 assert.ok(h.sqlite.prepare("SELECT id FROM control_audit WHERE action='security.reauth-required'").get());
 const recent={...owner,recentReauth:true};
 assert.equal((await h.call('challenge',recent,{phrase})).status,200);
 assert.equal((await h.call('students/suspend',owner,{id:student.id,suspended:true})).status,428);
 assert.equal((await h.call('students/suspend',recent,{id:student.id,suspended:true})).status,200);
});

test('session revocation uses the target’s immutable Clerk subject and never accepts a cross-account session',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 await h.challenge();
 const revoked=[];
 const clerk={getSessionList:async options=>{
  assert.equal(options.userId,'user_student');
  return {data:[{id:'sess_fixture',userId:'user_student'}]};
 },revokeSession:async id=>revoked.push(id)};
 const success=await h.call('students/revoke',owner,{id:student.id},{clerk});
 assert.equal((await success.json()).revoked,1);
 assert.deepEqual(revoked,['sess_fixture']);
 clerk.getSessionList=async()=>({data:[{id:'sess_wrong',userId:'user_editor'}]});
 assert.equal((await h.call('students/revoke',owner,{id:student.id},{clerk})).status,502);
 assert.deepEqual(revoked,['sess_fixture']);
 assert.ok(h.sqlite.prepare("SELECT id FROM control_audit WHERE action='student.sessions-revoke-failed'").get());
});

test('onboarding reset and academic correction are account-bound and never change existing progress',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 h.sqlite.prepare('INSERT INTO study_snapshots VALUES (?,?,?,?)').run(student.id,9,'{"private":"progress"}','2026-11-22');
 await h.challenge();
 const invalid={id:student.id,studentGroup:'M1',studentSection:'A',labGroup:'2.1'};
 assert.equal((await h.call('students/assignment',owner,invalid)).status,400);
 assert.equal((await h.call('students/assignment',owner,{...invalid,labGroup:'1.6'})).status,200);
 assert.equal((await h.call('students/reset',owner,{id:student.id,confirm:'no'})).status,400);
 assert.equal((await h.call('students/reset',owner,{id:student.id,confirm:'RESET ONBOARDING'})).status,200);
 const {assignment,resetId}=await (await h.call('student/status',student)).json();
 assert.equal(assignment.labGroup,'1.6');assert.ok(resetId);
 assert.equal((await h.call('student/reset-complete',editor,{resetId})).status,409);
 assert.equal((await h.call('student/reset-complete',student,{resetId})).status,200);
 assert.deepEqual({...h.sqlite.prepare('SELECT revision,snapshot FROM study_snapshots WHERE user_id=?').get(student.id)},{revision:9,snapshot:'{"private":"progress"}'});
 const data=await (await h.call('students/list?q=student&class=M1&group=A&lab=1.6',owner)).json();
 assert.equal(data.students[0].id,student.id);
 assert.doesNotMatch(JSON.stringify(data),/snapshot|completedReviews|answeredQuestions/);
});

test('maintenance gates only bounded operations and analytics suppresses small consent groups',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 h.sqlite.prepare('UPDATE review_accounts SET analytics_opt_in=1,analytics_json=? WHERE id=?').run('{"answeredQuestions":99,"completedReviews":8}',student.id);
 await h.challenge();
 const data=await (await h.call('analytics',owner)).json();
 assert.equal(data.summary.answeredQuestions,null);
 assert.equal(data.summary.completedReviews,null);
 assert.equal((await h.call('analytics',editor)).status,403);
 const flags={readOnly:true,sharedUploads:false,reports:false,resourceLibrary:false,maintenance:'Scheduled service'};
 assert.equal((await h.call('site/save',owner,flags)).status,200);
 assert.equal((await h.call('student/reports',student,{kind:'broken-image'})).status,503);
 assert.equal((await h.call('student/resources',student)).status,503);
 assert.ok(adminWriteGate('api/progress','PATCH',flags));
 assert.equal(adminWriteGate('api/progress','GET',flags),null);
 assert.equal(adminWriteGate('api/control-center/site/save','POST',flags),null);
});

test('study totals refresh only for the authenticated account and cannot re-enable sharing',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const read=id=>h.sqlite.prepare('SELECT analytics_opt_in,analytics_json FROM review_accounts WHERE id=?').get(id);
 const counts={completedReviews:8,answeredQuestions:24};
 assert.equal((await (await h.call('student/study-counts',student,counts)).json()).accepted,false);
 h.sqlite.prepare('UPDATE review_accounts SET analytics_opt_in=1 WHERE id=?').run(student.id);
 assert.equal((await (await h.call('student/study-counts',student,counts)).json()).accepted,true);
 assert.deepEqual(JSON.parse(read(student.id).analytics_json),counts);
 assert.deepEqual(JSON.parse(read(editor.id).analytics_json),{});
 h.sqlite.prepare("UPDATE review_accounts SET analytics_opt_in=0,analytics_json='{}' WHERE id=?").run(student.id);
 assert.equal((await (await h.call('student/study-counts',student,counts)).json()).accepted,false);
 assert.equal(read(student.id).analytics_opt_in,0);
 assert.deepEqual(JSON.parse(read(student.id).analytics_json),{});
});

test('student details are owner-only and return a scoped avatar and minimal session history',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const clerk={
  users:{getUser:async id=>({id,hasImage:true,imageUrl:'https://img.clerk.com/example'})},
  sessions:{getSessionList:async ({userId,limit})=>{
   assert.equal(userId,'user_student');
   assert.equal(limit,10);
   return {data:[{id:'private-session',userId,createdAt:10,lastActiveAt:20,
    latestActivity:{deviceType:'Tablet',browserName:'Safari',ipAddress:'192.0.2.10',city:'Private city'}}]};
  }},
 };
 const route='students/details?id='+encodeURIComponent(student.id);
 assert.equal((await h.call(route,student,undefined,{clerk})).status,403);
 assert.equal((await h.call(route,editor,undefined,{clerk})).status,403);
 const data=await (await h.call(route,owner,undefined,{clerk})).json();
 assert.equal(data.photo,'https://img.clerk.com/example');
 assert.equal(data.activeMinutes,null);
 assert.deepEqual(data.sessions,[{createdAt:10,lastActiveAt:20,browser:'Safari',device:'Tablet'}]);
 assert.doesNotMatch(JSON.stringify(data),/private-session|192\.0\.2\.10|Private city/);
 assert.ok(h.sqlite.prepare("SELECT id FROM control_audit WHERE action='student.details-viewed' AND target=?").get(student.id));
 clerk.sessions.getSessionList=async()=>({data:[{userId:'user_editor'}]});
 assert.equal((await (await h.call(route,owner,undefined,{clerk})).json()).sessions,null);
});

test('profile corrections are validated, audited and reversible without changing the source profile',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const before=h.sqlite.prepare('SELECT profile_json FROM review_accounts WHERE id=?').get(student.id);
 const profile={id:student.id,name:'Corrected Student',studentNumber:'90001',studentGroup:'M2',studentSection:'A',labGroup:'2.1',englishFrequency:3,englishStartTime:'17:00'};
 assert.equal((await h.call('students/profile',owner,profile)).status,428);
 await h.challenge();
 assert.equal((await h.call('students/profile',owner,{...profile,labGroup:'99.9'})).status,400);
 assert.equal((await h.call('students/profile',owner,{...profile,id:owner.id})).status,403);
 assert.equal((await h.call('students/profile',owner,profile)).status,200);
 const list=await (await h.call('students/list?q=Corrected',owner)).json();
 assert.equal(list.students[0].name,'Corrected Student');
 assert.equal((await (await h.call('student/status',student)).json()).assignment.studentNumber,'90001');
 assert.equal((await h.call('students/clear-assignment',owner,{id:student.id})).status,200);
 const status=await (await h.call('student/status',student)).json();
 assert.equal(status.assignment.studentGroup,undefined);
 assert.equal(status.assignment.englishStartTime,'17:00');
 assert.equal((await h.call('students/clear-profile',owner,{id:student.id})).status,200);
 assert.equal((await (await h.call('student/status',student)).json()).assignment,null);
 assert.deepEqual(h.sqlite.prepare('SELECT profile_json FROM review_accounts WHERE id=?').get(student.id),before);
});

test('active minutes are counted for every signed-in account without changing study sharing',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const pulse=()=>h.call('student/active-minute',student,{});
 assert.equal((await h.call('student/active-minute',null,{})).status,401);
 assert.equal((await (await pulse()).json()).accepted,true);
 assert.equal(h.sqlite.prepare('SELECT analytics_opt_in FROM review_accounts WHERE id=?').get(student.id).analytics_opt_in,0);
 h.sqlite.prepare('UPDATE review_accounts SET analytics_opt_in=1 WHERE id=?').run(student.id);
 await pulse();
 await pulse();
 await h.call('student/study-counts',student,{completedReviews:2,answeredQuestions:5});
 const row=h.sqlite.prepare('SELECT analytics_json FROM review_accounts WHERE id=?').get(student.id);
 const record=JSON.parse(row.analytics_json);
 assert.equal(record.activeMinutes,1);
 assert.equal(record.completedReviews,2);
 assert.equal(record.answeredQuestions,5);
});

test('the owner can disable and re-enable the course archive without rewriting previous data',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const fields={readOnly:false,sharedUploads:true,reports:true,resourceLibrary:true,maintenance:''};
 const profile=h.sqlite.prepare('SELECT profile_json FROM review_accounts WHERE id=?').get(student.id);
 assert.equal((await h.call('site/save',student,{...fields,archiveCvp:false})).status,403);
 await h.challenge();
 assert.equal((await h.call('site/save',owner,{...fields,archiveCvp:false})).status,200);
 assert.equal((await (await h.call('student/status',student)).json()).flags.archiveCvp,false);
 assert.equal((await h.call('site/save',owner,fields)).status,200);
 assert.equal((await (await h.call('student/status',student)).json()).flags.archiveCvp,false);
 assert.equal((await h.call('site/save',owner,{...fields,archiveCvp:true})).status,200);
 assert.equal((await (await h.call('student/status',student)).json()).flags.archiveCvp,true);
 assert.deepEqual(h.sqlite.prepare('SELECT profile_json FROM review_accounts WHERE id=?').get(student.id),profile);
});

test('the owner can set, keep and clear course end dates, and students receive them',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const fields={readOnly:false,sharedUploads:true,reports:true,resourceLibrary:true,maintenance:''};
 const ends=async()=>(await (await h.call('student/status',student)).json()).flags.courseEnds;
 assert.deepEqual(await ends(),{});
 assert.equal((await h.call('site/save',student,{...fields,courseEnds:{CVP:'2026-11-20'}})).status,403);
 await h.challenge();
 assert.equal((await h.call('site/save',owner,{...fields,courseEnds:{CVP:'2026-11-20',MOL:''}})).status,200);
 assert.deepEqual(await ends(),{CVP:'2026-11-20'});
 assert.equal((await h.call('site/save',owner,fields)).status,200);
 assert.deepEqual(await ends(),{CVP:'2026-11-20'});
 for(const bad of [{CVP:'20-11-2026'},{'cvp; drop':'2026-11-20'},['2026-11-20'],'CVP'])
  assert.equal((await h.call('site/save',owner,{...fields,courseEnds:bad})).status,400);
 assert.equal((await h.call('site/save',owner,{...fields,courseEnds:{CVP:''}})).status,200);
 assert.deepEqual(await ends(),{});
});

test('student and role listing keyset pages preserve ties and exclude duplicate accounts',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const insert=h.sqlite.prepare('INSERT INTO review_accounts(id,email,created_at,last_seen_at,profile_json) VALUES (?,?,?,?,?)');
 for(let i=0;i<60;i++)insert.run(prefix+'user_page_'+String(i).padStart(3,'0'),'page-'+i+'@example.test',i<30?'2026-11-24T12:00:00Z':'2026-11-25T12:00:00Z','2026-11-25T12:00:00Z','{}');
 const expected=h.sqlite.prepare("SELECT id FROM review_accounts WHERE email LIKE 'page-%' ORDER BY created_at DESC,id ASC").all().map(r=>r.id);
 for(const section of ['students','roles']){
  const ids=[];let cursor=null,page=0;
  do{
   const res=await h.call(section+'/list?q=page-&page='+page+(cursor?'&cursor='+encodeURIComponent(cursor):''),owner);
   assert.equal(res.status,200);const result=await res.json();assert.equal(result.page,page);assert.ok(result.students.length<=25);ids.push(...result.students.map(x=>x.id));cursor=result.nextCursor;page++;assert.ok(page<5);
  }while(cursor);
  assert.deepEqual(ids,expected);
 }
 assert.equal((await h.call('students/list?cursor=malformed',owner)).status,400);
 assert.equal((await h.call('students/list?page=5',owner)).status,400);
 assert.equal((await h.call('students/list?cursor=malformed',student)).status,403);
 assert.ok(h.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='review_accounts_created_id_idx'").get());
});

test('owner audit filters are parameterized and preserve last-90-day boundary',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const insert=h.sqlite.prepare('INSERT INTO control_audit(id,actor,role,action,target,created_at) VALUES(?,?,?,?,?,?)');
 const id=prefix+'user_student',today=new Date().toISOString(),old=new Date(Date.now()-100*86400000).toISOString();
 insert.run('audit-1',id,'owner','student.profile-corrected','student-one',today);
 insert.run('audit-2',id,'moderator','question.report','report-two',today);
 insert.run('audit-3',id,'owner','student.profile-corrected','student-old',old);
 const list=async p=>(await (await h.call('audit?'+p,owner)).json()).entries.map(x=>x.id);
 assert.deepEqual(await list('role=owner&action=student.&q=student-one'),['audit-1']);
 assert.deepEqual(await list('role=moderator'),['audit-2']);
 assert.deepEqual(await list('q=student-old'),[]);
 assert.equal((await h.call('audit?role=admin',owner)).status,400);
 assert.equal((await h.call('audit?from=2026-11-25&to=2026-11-20',owner)).status,400);
 assert.equal((await h.call('audit?action=student.%27%20OR%201%3D1',owner)).status,400);
 assert.equal((await h.call('audit?q=student-one',student)).status,403);
});

test('owner system health is read-only, probes real bindings, and never exposes account identifiers',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());
 const seen=[];h.env.BUCKET={async list(options){seen.push(options);return {objects:[],truncated:false}}};
 const result=await h.call('analytics/health',owner),body=await result.json();
 assert.equal(result.status,200);assert.equal(body.database,'reachable');assert.equal(body.storage,'reachable');
 assert.equal(body.clerkSession,'verified for this request');
 assert.equal(body.cpu,'not instrumented');assert.deepEqual(seen,[{prefix:'__health_probe_read_only__/',limit:1}]);
 assert.doesNotMatch(JSON.stringify(body),/owner@example\.test|user_student|phrase/);
 assert.equal((await h.call('analytics/health',student)).status,403);
 assert.equal((await h.call('analytics/health',editor)).status,403);
 delete h.env.BUCKET;const missing=await(await h.call('analytics/health',owner)).json();assert.equal(missing.storage,'unavailable');
});

test('group CSV preview is non-mutating; apply requires a matching review and rejects protected or changed accounts',async t=>{
 const h=harness();t.after(()=>h.sqlite.close());await h.challenge();
 const rows=[{email:'student@example.test',studentGroup:'M1',studentSection:'A',labGroup:''}];
 const before=h.sqlite.prepare('SELECT assignment FROM control_students WHERE account_id=?').get(student.id);
 const preview=await h.call('students/group-import-preview',owner,{rows});assert.equal(preview.status,200);const p=await preview.json();assert.equal(p.valid,true);assert.equal(p.changes,1);assert.deepEqual(h.sqlite.prepare('SELECT assignment FROM control_students WHERE account_id=?').get(student.id),before);
 assert.equal((await h.call('students/group-import-apply',owner,{rows,token:'wrong'})).status,409);
 assert.equal((await h.call('students/group-import-preview',editor,{rows})).status,403);
 const bad=await (await h.call('students/group-import-preview',owner,{rows:[{...rows[0],email:'owner@example.test'}]})).json();assert.equal(bad.valid,false);
 const success=await h.call('students/group-import-apply',owner,{rows,token:p.token});assert.equal(success.status,200);
 assert.equal(JSON.parse(h.sqlite.prepare('SELECT assignment FROM control_students WHERE account_id=?').get(student.id).assignment).studentGroup,'M1');
 assert.equal((await h.call('students/group-import-apply',owner,{rows,token:p.token})).status,409);
});
