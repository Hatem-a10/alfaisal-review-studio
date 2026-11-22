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
   for(const statement of statements)await statement.run();
   sqlite.exec('COMMIT');
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
