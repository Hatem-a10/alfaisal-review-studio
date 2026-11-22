import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {academicAdmin,academicStudent,validateAcademicConfig} from '../lib/admin-academics.mjs';

function database(){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('staging/admin-academics.sql','utf8'));db.exec(fs.readFileSync('staging/schema.sql','utf8'));
 const prepare=sql=>{const stmt=db.prepare(sql);let args=[];return {bind(...values){args=values;return this},run(){return stmt.run(...args)},first(){return stmt.get(...args)||null},all(){return {results:stmt.all(...args)}}}};
 return {db,prepare,batch(items){db.exec('BEGIN');try{const result=items.map(item=>item.run());db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}};
}
const config=(overrides={})=>({groups:[{studentGroup:'M1',studentSection:'A',labGroups:['1.6']},{studentGroup:'M2',studentSection:'B',labGroups:['2.9']}],categories:[{id:'anatomy',label:'Anatomy'}],events:[{id:'lecture-1',title:'A1 Thorax',type:'lecture',date:'2026-12-01',startTime:'09:00',endTime:'10:00',studentGroup:'M1',studentSection:'A',labGroup:'1.6',course:'CVP',lecturer:'Dr. Olena',categoryId:'anatomy'}],...overrides});
const owner={id:'owner-test'},student={id:'student-test'};
const req=(method='GET',action='config',data)=>new Request(`https://stage.test/api/control-center/admin/academics/${action}`,{method,headers:{origin:'https://stage.test','content-type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
const audit=(action,target)=>({run(){return {action,target}}});
async function call(env,action,data,role='owner'){return academicAdmin({request:req(action==='config'?'GET':'POST',action,data),env,user:owner,row:{},role,section:'academics',action,data,audit,mutate:(statements)=>env.DB.batch([...statements,audit(action,'audit')])})}

test('academic configuration rejects malformed schedules and conflicting shared times',()=>{
 assert.equal(validateAcademicConfig(config()),null);
 assert.match(validateAcademicConfig(config({events:[...config().events,{...config().events[0],id:'overlap',studentGroup:undefined,studentSection:undefined,labGroup:undefined}]})),/Conflicting event times/);
 assert.match(validateAcademicConfig(config({events:[...config().events,{...config().events[0],id:'weekly-conflict',date:undefined,day:'Tuesday',studentGroup:undefined,studentSection:undefined,labGroup:undefined}]})),/Conflicting event times/);
 assert.match(validateAcademicConfig(config({events:[{...config().events[0],labGroup:'9.9'}]})),/configured class/);
 assert.match(validateAcademicConfig(config({events:[{...config().events[0],startTime:'10:00'}]})),/time range/);
});

test('only owner may read or write academic revisions; writes require same-origin',async()=>{
 const env={DB:database()};assert.equal((await call(env,'config',undefined,'student')).status,403);
 const bad=await academicAdmin({request:new Request('https://stage.test/api/x',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),env,user:owner,role:'owner',section:'academics',action:'save-draft',data:{configuration:config()},audit,mutate:()=>{throw Error('must not mutate')}});
 assert.equal(bad.status,403);assert.equal(env.DB.db.prepare('SELECT COUNT(*) AS n FROM review_academic_revisions').get().n,0);
});

test('draft, publish, and rollback use atomic revisioned updates without touching progress tables',async()=>{
 const store=database(),mutations=[];store.db.exec('CREATE TABLE review_progress(id TEXT PRIMARY KEY,value TEXT)');store.db.prepare("INSERT INTO review_progress VALUES('student-test','keep')").run();
 const env={DB:store},auditFn=(action,target)=>({run(){mutations.push([action,target])}}),mutate=async(statements,action,target)=>{mutations.push([action,target]);store.batch(statements)};
 const save=await academicAdmin({request:req('POST','save-draft',{configuration:config()}),env,user:owner,role:'owner',section:'academics',action:'save-draft',data:{configuration:config()},audit:auditFn,mutate});
 assert.equal(save.status,200);const draft=(await save.json()).draft;
 const publish=await academicAdmin({request:req('POST','publish',{revisionId:draft.id}),env,user:owner,role:'owner',section:'academics',action:'publish',data:{revisionId:draft.id},audit:auditFn,mutate});
 assert.equal(publish.status,200);assert.equal((await publish.json()).published.id,draft.id);
 const active=store.db.prepare('SELECT revision_id FROM review_academic_active').get();assert.equal(active.revision_id,draft.id);
 assert.deepEqual(store.db.prepare('SELECT class_code,group_code,configuration FROM review_academic_groups').all().map(r=>[r.class_code,r.group_code,JSON.parse(r.configuration).labGroups]),[['M1','A',['1.6']],['M2','B',['2.9']]]);
 assert.equal(store.db.prepare("SELECT value FROM review_progress WHERE id='student-test'").get().value,'keep');
 const rolled=await academicAdmin({request:req('POST','rollback',{revisionId:draft.id}),env,user:owner,role:'owner',section:'academics',action:'rollback',data:{revisionId:draft.id},audit:auditFn,mutate});
 assert.equal(rolled.status,200);const out=await rolled.json();assert.notEqual(out.published.id,draft.id);assert.equal(out.rolledBackFrom,draft.id);
 assert.equal(store.db.prepare('SELECT revision_id FROM review_academic_active').get().revision_id,out.published.id);
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM review_academic_revisions').get().n,2);
});

test('student schedule filters by server-held account group, section and lab without accepting identity input',async()=>{
 const store=database(),env={DB:store};
 const draftId='sched-v1',now=new Date().toISOString();store.db.prepare("INSERT INTO review_academic_revisions VALUES(?,?,'published','owner',?,?)").run(draftId,JSON.stringify(config()),now,now);
 store.db.prepare('INSERT INTO review_academic_active VALUES(1,?,?)').run(draftId,now);
 const response=await academicStudent({request:new Request('https://stage.test/api/control-center/student/academics'),env,user:student,row:{profile_json:JSON.stringify({studentGroup:'M2',studentSection:'B',labGroup:'2.9'})},path:'/api/control-center/student/academics'});
 assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.groups,[{studentGroup:'M2',studentSection:'B',labGroups:['2.9']}]);assert.deepEqual(body.events,[]);
 const ownerResponse=await academicStudent({request:new Request('https://stage.test/api/control-center/student/academics'),env,user:student,row:{profile_json:'{}',effectiveProfile:{studentGroup:'M1',studentSection:'A',labGroup:'1.6'}},path:'/api/control-center/student/academics'});
 const ownerBody=await ownerResponse.json();assert.equal(ownerBody.events.length,1);assert.equal(ownerBody.events[0].lecturer,'Dr. Olena');
});

test('browser runtime replaces exact non-REN catalog rows and adds published exam countdowns',async()=>{
 const source=fs.readFileSync('public/admin-academic-runtime.js','utf8'),settings={studentGroup:'M1',studentSection:'A',labGroup:'1.6'},catalog=[
  {id:'old-lecture',date:'2026-12-01',title:'Old A1',start:540,end:600,kind:'anatomy',course:'CVP'},
  {id:'ren-source',date:'2026-12-01',title:'REN session',start:540,end:600,kind:'other',course:'REN',source:'REN123_Fall 26-27 Weekly Time Table 10.0.xlsx'}
 ],published={profile:{studentGroup:'M1',studentSection:'A',labGroup:'1.6'},events:[
  {id:'replacement',replacesId:'old-lecture',title:'Updated A1',type:'lecture',date:'2026-12-01',startTime:'09:00',endTime:'10:00',studentGroup:'M1',studentSection:'A',labGroup:'1.6',course:'CVP',lecturer:'Dr. Olena'},
  {id:'exam-1',title:'CVP Final',type:'exam',date:'2026-12-02',startTime:'08:00',endTime:'11:00',studentGroup:'M1',studentSection:'A'}
 ]};
 let displayedSettings;
 const GroupSchedules={selected:(week,profile)=>{displayedSettings=profile;return catalog.slice()},assigned:()=>true},DATA={events:[]},window={reviewManagedAssignment:{studentGroup:'M2',studentSection:'B',labGroup:'2.9'},dispatchEvent(){}};
 const context={GroupSchedules,DATA,window,settings,fetch:async()=>({ok:true,json:async()=>published}),CustomEvent:class{},setTimeout,view:'calendar',render(){},Date,URL,console};
 runInNewContext(source,context);await new Promise(resolve=>setTimeout(resolve,0));
 const rows=GroupSchedules.selected('2026-11-29',settings,{events:[]},[],false);
 assert.equal(displayedSettings.studentGroup,'M2');
 assert.equal(displayedSettings.labGroup,'2.9');
 assert.equal(settings.studentGroup,'M1');
 assert.equal(settings.labGroup,'1.6');
 window.reviewManagedAssignment=null;
 GroupSchedules.selected('2026-11-29',settings,{events:[]},[],false);
 assert.equal(displayedSettings,settings);
 assert.ok(rows.some(row=>row.id==='ren-source'),'REN official source remains governing');
 assert.ok(rows.some(row=>row.id==='admin-replacement-2026-12-01'));
 assert.ok(rows.some(row=>row.id==='admin-exam-1-2026-12-02'));
 assert.ok(!rows.some(row=>row.id==='old-lecture'));
 assert.equal(DATA.events.length,1);assert.equal(DATA.events[0].title,'CVP Final');
});
