import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';

function load(path,deps={}) {
 const module={exports:{}};
 const compiled=ts.transpileModule(readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 new Function('require','module','exports',compiled)(name=>name.endsWith('.json')?{default:deps[name]}:deps[name],module,module.exports);
 return module.exports;
}

test('legacy owner cache is reachable only from a verified owner boot',async()=>{
 const script=readFileSync('public/account-bootstrap.js','utf8');
 for (const scenario of ['owner','student','signed-out','failed']) {
  const accessed=[], loaded=[], redirects=[], status={after(){}}, retry={hidden:true};
  const document={getElementById:id=>id==='appBootText'?status:retry,
   createElement:()=>({}),querySelector:s=>s==='.profile-name'?{firstChild:{}}:{},
   querySelectorAll:()=>[{dataset:{studioSrc:'/bundle.js'},after:s=>{loaded.push(s.src);s.onload()}}],
   documentElement:{dataset:{},style:{setProperty(){}}}};
  const ctx={document,localStorage:{getItem:k=>{accessed.push(k);return null}},
   fetch:async()=>({ok:scenario!=='failed',json:async()=>({
    signedIn:scenario!=='signed-out',owner:scenario==='owner',key:'a'.repeat(64),profile:{name:'Owner',number:''}
   })}),
   location:{replace:url=>redirects.push(url)}};
  await vm.runInNewContext(script,ctx);
  assert.equal(loaded.length,scenario==='owner'?1:0);
  assert.equal(accessed.includes('alfaisal-review-studio-v1'),scenario==='owner');
  assert.deepEqual(redirects,scenario==='student'?['/student']:[]);
 }
});

test('a stale tab cannot send a progress request under a different account',async()=>{
 const env={REVIEW_OWNER_ID:'owner'};
 const api=load('lib/review-account.ts',{'cloudflare:workers':{env}});
 const identity=id=>new Headers({'oai-authenticated-user-id':id});
 const owner=await api.reviewAccount(identity('owner'));
 const a=await api.reviewAccount(identity('student-a'));
 const b=await api.reviewAccount(identity('student-b'));
 assert.equal(owner.owner,true);
 assert.equal(a.owner,false);
 assert.notEqual(a.key,b.key);
 const req=(id,key)=>new Request('https://review.example/api/progress',{headers:{
  'oai-authenticated-user-id':id,'X-Review-Account':key}});
 assert.equal(await api.requireAccountMatch(req('student-a',a.key)),null);
 assert.equal((await api.requireAccountMatch(req('student-b',a.key))).status,409);
 assert.equal((await api.requireAccountMatch(req('student-a',owner.key))).status,409);
});

test('student setup accepts independent historical passes only for configured lecture IDs',()=>{
 const {cleanProfile,validGroup}=load('lib/student-profile.ts',{'./cvp-section-defaults.json':JSON.parse(readFileSync('lib/cvp-section-defaults.json','utf8'))});
 const group={classCode:'M1',groupCode:'Fixture group',lectures:[{id:'CVP-A1',title:'Fixture lecture',course:'CVP'}]};
 const input={step:6,name:'Student A',classCode:'M1',groupCode:'Fixture group',theme:'dark',
  accent:'#123456',reviews:{'CVP-A1':[2]},plan:'gradual',analytics:false};
 assert.equal(validGroup(group),true);
 assert.deepEqual(cleanProfile(input,[group],true)?.reviews,{'CVP-A1':[2]});
 assert.equal(cleanProfile({...input,groupCode:'Unverified'},[group],true),null);
 assert.equal(cleanProfile({...input,reviews:{'MOL-1':[0]}},[group],true),null);
 assert.equal(cleanProfile({...input,reviews:{'CVP-A1':[0,0]}},[group],true),null);
});

test('catch-up preserves historical completion and fixed dates and skips verified breaks',()=>{
 const {studentPlan}=load('lib/student-plan.ts');
 const group={lectures:[
  {id:'CVP-A1',title:'One',reviewsOn:['2026-11-01','2026-11-02','2026-11-15']},
  {id:'CVP-A2',title:'Two',reviewsOn:['2026-11-03','2026-11-04','2026-11-16']}
 ],events:[{date:'2026-11-08',kind:'break'}]};
 const profile={plan:'gradual',reviews:{'CVP-A1':[0]}};
 const rows=studentPlan(group,profile,'2026-11-08');
 assert.equal(rows.some(row=>row.id==='CVP-A1'&&row.pass===0),false);
 assert.equal(rows.some(row=>row.date==='2026-11-08'),false);
 assert.equal(rows.find(row=>row.id==='CVP-A1'&&row.pass===2).date,'2026-11-15');
 assert.equal(rows.find(row=>row.id==='CVP-A2'&&row.pass===0).date,'2026-11-09');
 assert.equal(rows.find(row=>row.id==='CVP-A2'&&row.pass===1).date,'2026-11-10');
 assert.equal(studentPlan(group,{...profile,plan:'upcoming'},'2026-11-08')[0].date,null);
});

test('review writes use the authenticated student and leave historical and owner records alone',async t=>{
 const sqlite=new DatabaseSync(':memory:');
 t.after(()=>sqlite.close());
 sqlite.exec(readFileSync('drizzle/0002_multi_student.sql','utf8'));
 const group={classCode:'M1',groupCode:'Fixture',lectures:[{id:'CVP-A1',title:'Lecture',course:'CVP'}]};
 sqlite.prepare('INSERT INTO review_academic_groups VALUES(?,?,?)').run('M1','Fixture',JSON.stringify(group));
 for(const id of ['student-a','student-b','owner']) {
  const profile=JSON.stringify({classCode:'M1',groupCode:'Fixture',reviews:{'CVP-A1':[0]}});
  sqlite.prepare('INSERT INTO review_student_profiles VALUES(?,?,?,?,?)').run(id,profile,'old','old','old');
 }
 const db={
  prepare(query){return{bind(...params){
   const stmt=sqlite.prepare(query);
   return {run:()=>({meta:{changes:stmt.run(...params).changes}}),first:()=>stmt.get(...params),all:()=>({results:stmt.all(...params)})};
  },all(){return{results:sqlite.prepare(query).all()}}}},
  batch(statements){return statements.map(statement=>statement.run());}
 };
 const cloud={'cloudflare:workers':{env:{DB:db,REVIEW_OWNER_ID:'owner'}}};
 const account=load('lib/review-account.ts',cloud);
 const route=load('app/api/student-reviews/route.ts',{...cloud,
  '../../../lib/review-account':account,'../../../lib/student-profile':load('lib/student-profile.ts',{'./cvp-section-defaults.json':JSON.parse(readFileSync('lib/cvp-section-defaults.json','utf8'))})});
 const req=async (id,pass,key=null)=>{
  const url='https://review.example/api/student-reviews';
  const headers=new Headers({'oai-authenticated-user-id':id,Origin:new URL(url).origin});
  headers.set('X-Review-Account',key||(await account.reviewAccount(headers)).key);
  return new Request(url,{method:'PUT',headers,body:JSON.stringify({lectureId:'CVP-A1',pass,complete:true,userId:'owner'})});
 };
 const a=await account.reviewAccount(new Headers({'oai-authenticated-user-id':'student-a'}));
 assert.equal((await route.PUT(await req('student-a',1))).status,200);
 assert.equal((await route.PUT(await req('student-a',0))).status,403);
 assert.equal((await route.PUT(await req('student-b',2,a.key))).status,409);
 assert.equal((await route.PUT(await req('owner',2))).status,403);
 const rows=sqlite.prepare('SELECT user_id,pass FROM review_student_passes').all();
 assert.equal(rows.length,1);
 assert.equal(rows[0].user_id,'student-a');
 assert.equal(rows[0].pass,1);
 assert.equal(sqlite.prepare("SELECT active_at FROM review_student_profiles WHERE user_id='owner'").get().active_at,'old');
});

test('optional personal English schedules accept both offered day patterns and a valid Riyadh time range',()=>{
 const {cleanProfile}=load('lib/student-profile.ts',{'./cvp-section-defaults.json':JSON.parse(readFileSync('lib/cvp-section-defaults.json','utf8'))});
 const input={step:2,name:'Student',classCode:'',groupCode:'',theme:'light',accent:'#123456',
  reviews:{},plan:'gradual',analytics:false};
 assert.equal(cleanProfile(input,[],false)?.english,undefined);
 for(const pattern of ['mon-wed','sun-tue-thu']){
  const english={pattern,start:'17:30',end:'19:00'};
  assert.deepEqual(cleanProfile({...input,english},[],false)?.english,english);
 }
 assert.equal(cleanProfile({...input,english:{pattern:'sun-tue-thu',start:'19:00',end:'17:30'}},[],false),null);
 assert.equal(cleanProfile({...input,english:{pattern:'weekend',start:'17:30',end:'19:00'}},[],false),null);
});

test('the workbook and rosters yield four section schedules and disjoint TBL teams',()=>{
 const data=JSON.parse(readFileSync('lib/cvp-section-defaults.json','utf8'));
 const {validGroup,cleanProfile,eventsForStudent}=load('lib/student-profile.ts',{'./cvp-section-defaults.json':data});
 const expected={M1:17,M2:11,F1:22,F2:15};
 const all=[];
 for(const group of data) {
  assert.equal(validGroup(group),true,group.classCode);
  assert.equal(group.lectures.filter(lecture=>lecture.course==='CVP 112').length,51);
  assert.equal(group.lectures.filter(lecture=>lecture.course==='MOL 114').length,13);
  assert.equal(group.tblGroups.length,expected[group.classCode]);
  assert.equal(group.events.filter(event=>event.title.startsWith('CVP 112 · TBL ')).length,6);
  assert.ok(group.events.some(event=>event.title==='CVP 112 Final Exam'&&event.date==='2026-11-18'&&event.time==='08:00'));
  all.push(...group.tblGroups);
 }
 assert.equal(new Set(all).size,65);
 const group=data.find(group=>group.classCode==='M1');
 const base={step:6,name:'Fixture',classCode:'M1',groupCode:'M1',theme:'light',accent:'#123456',reviews:{},plan:'gradual',analytics:false};
 assert.equal(cleanProfile({...base,tblGroup:'M18'},data,true),null);
 assert.equal(cleanProfile({...base,tblGroup:'M1'},data,true)?.tblGroup,'M1');
 assert.equal(eventsForStudent(group,base).some(event=>event.labStream),false);
 const labs=eventsForStudent(group,{...base,labStream:'A',labGroup:'1.6'}).filter(event=>event.labStream);
 assert.ok(labs.some(event=>event.labGroups?.includes('1.6')));
 assert.ok(labs.every(event=>event.labStream==='A'&&(!event.labGroups||event.labGroups.includes('1.6'))));
 assert.equal(cleanProfile({...base,tblGroup:'M1',labStream:'A',labGroup:'1.7'},data,true),null);
});

test('the migration creates only new tables and keeps existing study records',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const name of ['0000_huge_gladiator','0001_purple_norman_osborn'])db.exec(readFileSync('drizzle/'+name+'.sql','utf8'));
  db.prepare('INSERT INTO study_snapshots(user_id,revision,snapshot,updated_at) VALUES(?,?,?,?)').run('owner',17,'{"owner":true}','old');
  const migration=readFileSync('drizzle/0002_multi_student.sql','utf8');
  assert.doesNotMatch(migration,/^\s*(ALTER|DROP|DELETE|UPDATE|INSERT)\b/im);
  db.exec(migration);
  assert.equal(db.prepare('SELECT revision FROM study_snapshots WHERE user_id=?').get('owner').revision,17);
 }finally{db.close()}
});
