import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {contentAdmin,contentStudent} from '../lib/admin-content.mjs';

function d1(db){
 return {prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},_run(){return db.prepare(sql).run(...args)}}},async batch(statements){db.exec('BEGIN');try{const result=statements.map(statement=>({meta:{changes:Number(statement._run().changes)}}));db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}};
}
async function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE review_accounts(id TEXT PRIMARY KEY,email TEXT,provider_name TEXT,created_at TEXT,last_seen_at TEXT,disabled INTEGER DEFAULT 0,analytics_opt_in INTEGER DEFAULT 0,admin_panel_unlocked INTEGER DEFAULT 0,profile_json TEXT DEFAULT '{}',analytics_json TEXT DEFAULT '{}');`);
 db.exec(await readFile(new URL('../staging/admin-content.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO review_accounts(id,email,profile_json) VALUES(?,?,?)').run('student-1','private@example.test',JSON.stringify({name:'Private Name',studentGroup:'M1',studentSection:'A',labGroup:'1.6'}));
 return {db: d1(db),raw:db};
}
const request=(path,method='GET',body)=>new Request('https://studio.test'+path,{method,headers:method==='POST'?{origin:'https://studio.test','content-type':'application/json'}:{},body:method==='POST'?JSON.stringify(body):undefined});
function writer(env){const audit=(action,target='')=>env.DB.prepare('INSERT INTO audit(action,target) VALUES(?,?)').bind(action,target);env.DB.prepare('CREATE TABLE IF NOT EXISTS audit(action TEXT,target TEXT)').run();const mutate=async(statements,action,target)=>env.DB.batch([...statements,audit(action,target)]);return {audit,mutate}}
const callAdmin=async(ctx,section,action,data)=>contentAdmin({...ctx,section,action,data,...writer(ctx.env)});

test('student reports are scoped to the reporter, rate-limited, and require same-origin POST',async()=>{
 const {db}=await fixture(),env={DB:db},user={id:'student-1'},row={profile_json:'{}'};
 assert.equal((await contentStudent({request:new Request('https://studio.test/api/control-center/student/reports',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({questionId:'CVP-Q7',kind:'incorrect-answer',details:'The source citation conflicts.'})}),env,user,row,path:'/api/control-center/student/reports'})).status,403);
 const first=await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'CVP-Q7',kind:'incorrect-answer',details:'The source citation conflicts.'}),env,user,row,path:'/api/control-center/student/reports'});
 assert.equal(first.status,201);
 const own=await contentStudent({request:request('/api/control-center/student/reports'),env,user,row,path:'/api/control-center/student/reports'});assert.equal((await own.json()).reports[0].question_id,'CVP-Q7');
 for(let i=1;i<10;i++)assert.equal((await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'CVP-Q'+i,kind:'other',details:'Please review.'}),env,user,row,path:'/api/control-center/student/reports'})).status,201);
 assert.equal((await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'CVP-Q99',kind:'other',details:'Daily cap'}),env,user,row,path:'/api/control-center/student/reports'})).status,429);
});

test('technical reports use the dedicated category and never accept fake question reports',async()=>{
 const {db,raw}=await fixture(),env={DB:db},user={id:'student-1'},row={};
 assert.equal((await contentStudent({request:request('/api/control-center/student/technical-report','POST',{questionId:'CVP-Q1',kind:'technical',details:'App issue'}),env,user,row,path:'/api/control-center/student/technical-report'})).status,400);
 assert.equal((await contentStudent({request:request('/api/control-center/student/technical-report','POST',{questionId:'site-technical',kind:'technical',details:'Settings page failed to save'}),env,user,row,path:'/api/control-center/student/technical-report'})).status,201);
 const report=raw.prepare('SELECT id,category,kind,question_id FROM review_question_reports').get();assert.deepEqual({...report},{id:report.id,category:'technical',kind:'technical',question_id:'site-technical'});
 const forbidden=await callAdmin({request:request('/api/control-center/reports/propose','POST',{}),env,user:{id:'editor-1'},row:{},role:'editor'},'reports','propose',{reportId:report.id,source:'App logs',patch:{explanation:'This is not a question.'}});assert.equal(forbidden.status,400);
});

test('editors can triage and propose, but only owner can approve; approval does not change live scoring',async()=>{
 const {db,raw}=await fixture(),env={DB:db},student={id:'student-1'};
 await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'CVP-Q7',kind:'incorrect-explanation',details:'Explanation reverses the pressure gradient.'}),env,user:student,row:{},path:'/api/control-center/student/reports'});
 const reportId=raw.prepare('SELECT id FROM review_question_reports').get().id;
 const context={request:request('/api/control-center/reports/update','POST',{}),env,user:{id:'editor-1'},row:{},role:'editor'};
 assert.equal((await callAdmin(context,'reports','update',{reportId,status:'resolved'})).status,403);
 assert.equal((await callAdmin(context,'reports','update',{reportId,status:'investigating'})).status,200);
 assert.equal((await callAdmin(context,'reports','propose',{reportId,source:'Lecture P6, slide 14',patch:{explanation:'Pressure moves down its gradient.'}})).status,200);
 assert.equal((await callAdmin({...context,user:{id:'moderator-1'},role:'moderator'},'reports','approve',{reportId})).status,403);
 const approved=await callAdmin({...context,user:{id:'owner-1'},role:'owner'},'reports','approve',{reportId});assert.equal(approved.status,200);assert.equal((await approved.json()).liveScoringChanged,false);
 assert.equal((await callAdmin({...context,user:{id:'owner-1'},role:'owner'},'reports','approve',{reportId})).status,409);
 const errata=await contentStudent({request:request('/api/control-center/student/errata'),env,user:student,row:{},path:'/api/control-center/student/errata'});assert.deepEqual((await errata.json()).errata[0].patch,{explanation:'Pressure moves down its gradient.'});
 const auditCount=raw.prepare('SELECT count(*) AS n FROM audit').get().n;assert.ok(auditCount>=3);
});

test('report listings omit student identity for editors and paginate without private records',async()=>{
 const {db}=await fixture(),env={DB:db};
 for(let i=0;i<3;i++)await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'Q'+i,kind:'other',details:'Review'}),env,user:{id:'student-1'},row:{},path:'/api/control-center/student/reports'});
 const context={request:request('/api/control-center/reports/list'),env,user:{id:'editor'},row:{},role:'editor'};
 const result=await callAdmin(context,'reports','list',{limit:2});const value=await result.json();assert.equal(value.reports.length,2);assert.equal(value.hasMore,true);assert.equal(value.total,3);assert.equal(Object.hasOwn(value.reports[0],'reporter'),false);
 const filtered=await contentAdmin({...context,request:request('/api/control-center/reports/list?q=Q2&status=open&page=0&limit=10'),section:'reports',action:'list',...writer(env)});const filteredValue=await filtered.json();assert.equal(filteredValue.total,1);assert.equal(filteredValue.reports[0].questionId,'Q2');
 const owner=await callAdmin({...context,user:{id:'owner'},role:'owner'},'reports','list',{limit:2});assert.equal((await owner.json()).reports[0].reporter.name,'Private Name');
});

test('announcements validate targets, schedule visibility, and never cross class/group boundaries',async()=>{
 const {db,raw}=await fixture(),env={DB:db};
 const context={request:request('/api/control-center/announcements/publish','POST',{}),env,user:{id:'mod'},row:{},role:'moderator'};
 assert.equal((await callAdmin(context,'announcements','publish',{title:'Missing target',body:'Details',audience:'class'})).status,400);
 const id='announcement-1',future=new Date(Date.now()+3600000).toISOString(),later=new Date(Date.now()+86400000).toISOString();
 assert.equal((await callAdmin(context,'announcements','publish',{id,title:'M1 update',body:'Room changed.',audience:'class',targetClass:'M1',startsAt:future,expiresAt:later})).status,200);
 const m1={request:request('/api/control-center/student/announcements'),env,user:{id:'student-1'},row:{effectiveProfile:{studentGroup:'M1',studentSection:'A'}},path:'/api/control-center/student/announcements'};
 assert.equal((await (await contentStudent(m1)).json()).announcements.length,0);
 const now=new Date(Date.now()-60000).toISOString();
 assert.equal((await callAdmin(context,'announcements','publish',{id,title:'M1 update',body:'Room changed.',audience:'class',targetClass:'M1',startsAt:now,expiresAt:later})).status,200);
 assert.equal((await (await contentStudent(m1)).json()).announcements.length,1);
 const m2={...m1,row:{effectiveProfile:{studentGroup:'M2',studentSection:'A'}}};assert.equal((await (await contentStudent(m2)).json()).announcements.length,0);
 const query=raw.prepare('SELECT status,target_class FROM review_announcements').get();assert.deepEqual({...query},{status:'published',target_class:'M1'});
 const draft=await callAdmin(context,'announcements','save',{id,title:'M1 update',body:'Accidental draft edit',audience:'class',targetClass:'M1',startsAt:now,expiresAt:later});assert.equal(draft.status,409);assert.equal(raw.prepare('SELECT status FROM review_announcements').get().status,'published');
});


test('default report pagination does not collapse to one result and irrelevant announcements do not consume student limit',async()=>{
 const {db,raw}=await fixture(),env={DB:db},user={id:'student-1'},row={profile_json:JSON.stringify({studentGroup:'M1',studentSection:'A',labGroup:'1.6'})};
 for(let i=0;i<2;i++)assert.equal((await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'REN-Q'+i,kind:'other',details:'Synthetic review'}),env,user,row,path:'/api/control-center/student/reports'})).status,201);
 const listing=await callAdmin({request:request('/api/control-center/admin/reports/list'),env,user:{id:'owner'},role:'owner'},'reports','list');const body=await listing.json();assert.equal(body.limit,30);assert.equal(body.reports.length,2);
 const insert=raw.prepare("INSERT INTO review_announcements(id,title,body,audience,target_class,priority,starts_at,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'published',?,?,?,?)");
 for(let i=0;i<101;i++)insert.run('other'+i,'Other group','Synthetic','class','M2','urgent','2020-01-01T00:00:00Z','owner','owner','2020-01-01','2020-01-01');
 insert.run('visible','Relevant','Synthetic','global',null,'normal','2020-01-01T00:00:00Z','owner','owner','2020-01-01','2020-01-01');
 const notices=await contentStudent({request:request('/api/control-center/student/announcements'),env,user,row,path:'/api/control-center/student/announcements'});
 assert.deepEqual((await notices.json()).announcements.map(a=>a.id),['visible']);
});
test('proposal validation rejects nonexistent selected options and duplicates after cleanup',async()=>{
 const {db}=await fixture(),env={DB:db},user={id:'student-1'};
 const created=await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'REN-Q1',kind:'other',details:'Synthetic review'}),env,user,path:'/api/control-center/student/reports'});const {id:reportId}=await created.json();
 for(const patch of [{options:['a','b','c','d'],answer:4},{options:['a','A','c','d']},{question:'\u0001'}]){
  const r=await callAdmin({request:request('/api/control-center/admin/reports/propose','POST',{}),env,user:{id:'editor'},role:'editor'},'reports','propose',{reportId,source:'Synthetic source',patch});
  assert.equal(r.status,400);
 }
});
test('review-only endpoints reject POST and malformed profile JSON does not crash notices',async()=>{
 const {db}=await fixture(),env={DB:db},user={id:'student-1'};
 for(const name of ['announcements','errata']){const path='/api/control-center/student/'+name;assert.equal((await contentStudent({request:request(path,'POST',{}),env,user,path})).status,405)}
 const path='/api/control-center/student/announcements';assert.equal((await contentStudent({request:request(path),env,user,row:{profile_json:'null'},path})).status,200);
});
test('an editor replacement between approval read and write cannot be approved by the stale owner request',async()=>{
 const {db,raw}=await fixture(),env={DB:db},user={id:'student-1'};
 const created=await contentStudent({request:request('/api/control-center/student/reports','POST',{questionId:'REN-Q1',kind:'other',details:'Synthetic review'}),env,user,path:'/api/control-center/student/reports'});const {id:reportId}=await created.json();
 const context={request:request('/api/control-center/admin/reports/propose','POST',{}),env,user:{id:'editor'},role:'editor'};
 assert.equal((await callAdmin(context,'reports','propose',{reportId,source:'Synthetic source',patch:{question:'First proposal'}})).status,200);
 const r=await contentAdmin({request:request('/api/control-center/admin/reports/approve','POST',{}),env,user:{id:'owner'},role:'owner',section:'reports',action:'approve',data:{reportId},mutate:async statements=>{
  raw.prepare('UPDATE review_question_reports SET patch_json=? WHERE id=?').run(JSON.stringify({question:'Different proposal'}),reportId);
  return db.batch(statements);
 }});
 assert.equal(r.status,409);assert.equal(raw.prepare('SELECT count(*) AS n FROM review_question_revisions').get().n,0);
});

test('admin triage list filters by exact category without exposing reporter identity to editors',async()=>{
 const {db,raw}=await fixture(),env={DB:db},user={id:'student-1'};
 for(const [kind,questionId] of [['other','REN-Q1'],['incorrect-answer','REN-Q2'],['technical','site-technical']]){
  const path=kind==='technical'?'technical-report':'reports';
  assert.equal((await contentStudent({request:request('/api/control-center/student/'+path,'POST',{questionId,kind,details:'Synthetic review'}),env,user,path:'/api/control-center/student/'+path})).status,201);
 }
 const path='/api/control-center/reports/list?category=technical&limit=50';
 const response=await contentAdmin({request:request(path),env,user:{id:'editor'},row:{},role:'editor',section:'reports',action:'list',...writer(env)});
 const body=await response.json();assert.equal(body.total,1);assert.equal(body.reports[0].questionId,'site-technical');
 assert.equal(Object.hasOwn(body.reports[0],'reporter'),false);
 assert.equal((await (await contentAdmin({request:request('/api/control-center/reports/list?category=incorrect-answer'),env,user:{id:'owner'},row:{},role:'owner',section:'reports',action:'list',...writer(env)})).json()).total,1);
 assert.equal((await (await contentAdmin({request:request('/api/control-center/reports/list?category=other%27%20OR%201%3D1'),env,user:{id:'editor'},row:{},role:'editor',section:'reports',action:'list',...writer(env)})).json()).total,0);
});

test('announcement reach counts current effective assignments without returning student identities',async()=>{
 const {db,raw}=await fixture(),env={DB:db};
 raw.exec('CREATE TABLE control_students(account_id TEXT PRIMARY KEY,assignment TEXT)');
 raw.prepare('INSERT INTO review_accounts(id,email,profile_json,disabled) VALUES(?,?,?,?)').run('other','other@example.test',JSON.stringify({studentGroup:'M2',studentSection:'A',labGroup:'2.1'}),0);
 raw.prepare('INSERT INTO review_accounts(id,email,profile_json,disabled) VALUES(?,?,?,?)').run('disabled','disabled@example.test',JSON.stringify({studentGroup:'M1',studentSection:'A',labGroup:'1.6'}),1);
 raw.prepare('INSERT INTO control_students VALUES (?,?)').run('other',JSON.stringify({studentGroup:'M1',studentSection:'B',labGroup:'1.7'}));
 const insert=raw.prepare("INSERT INTO review_announcements(id,title,body,audience,target_class,target_section,target_lab,priority,starts_at,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'normal',?,'draft','owner','owner',?,?)");
 const at=new Date().toISOString();
 for(const [id,aud,cls,sec,lab] of [['global','global',null,null,null],['class','class','M1',null,null],['group','group','M1','A',null],['lab','lab','M1','B','1.7'],['none','class','F2',null,null]])insert.run(id,id,'body',aud,cls,sec,lab,at,at,at);
 const res=await contentAdmin({request:request('/api/control-center/announcements/list'),env,user:{id:'owner'},role:'owner',section:'announcements',action:'list'});
 assert.equal(res.status,200);const body=await res.json(),counts=Object.fromEntries(body.announcements.map(x=>[x.id,x.eligibleAccounts]));
 assert.deepEqual(counts,{global:2,class:2,group:1,lab:1,none:0});
 assert.doesNotMatch(JSON.stringify(body),/other@example|student-1|disabled@example/);
});
