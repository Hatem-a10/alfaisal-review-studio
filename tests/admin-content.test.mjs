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
