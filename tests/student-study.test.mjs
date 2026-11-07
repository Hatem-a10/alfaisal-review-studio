import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

function load(path,deps={}) {
 const module={exports:{}};
 const compiled=ts.transpileModule(readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 new Function('require','module','exports',compiled)(name=>{
  if (!Object.hasOwn(deps,name)) throw Error('Missing fixture dependency '+name);
  return deps[name];
 },module,module.exports);
 return module.exports;
}

const question={id:'fixture',question:'Which option is correct?',options:['One','Two','Three','Four'],
 answer:1,reasons:['No','Yes','No','No'],explanation:'Two is correct.'};
const content=[{id:'topic',title:'Card',body:['Teaching.'],keyPoints:['Takeaway.'],questions:[question]}];
const group={classCode:'M1',groupCode:'Fixture',lectures:[{id:'CVP-A1',title:'Assigned lecture',course:'CVP',
 documents:[{path:'materials/cvp-slides-a1.pdf',title:'Slides',kind:'slides'}]}]};

function fixture(t) {
 const sqlite=new DatabaseSync(':memory:');
 t.after(()=>sqlite.close());
 sqlite.exec(readFileSync('drizzle/0002_multi_student.sql','utf8'));
 sqlite.prepare('INSERT INTO review_academic_groups VALUES (?,?,?)').run('M1','Fixture',JSON.stringify(group));
 for(const id of ['student-a','student-b','owner'])sqlite.prepare('INSERT INTO review_student_profiles VALUES (?,?,?,?,?)')
  .run(id,JSON.stringify({classCode:'M1',groupCode:'Fixture'}),'old','old','old');
 const DB={
  prepare(query){
   function statement(params){
    const stmt=sqlite.prepare(query);
    return {run:()=>({meta:{changes:stmt.run(...params).changes}}),
     first:()=>stmt.get(...params),all:()=>({results:stmt.all(...params)})};
   }
   return {...statement([]),bind:(...params)=>statement(params)};
  },
  batch(statements){return statements.map(statement=>statement.run());}
 };
 const env={DB,BUCKET:{},REVIEW_OWNER_ID:'owner'};
 const cloud={'cloudflare:workers':{env}};
 const account=load('lib/review-account.ts',cloud);
 const profile=load('lib/student-profile.ts',{'./cvp-section-defaults.json':{default:[]}});
 const access=load('lib/student-lesson-access.ts',{...cloud,'./review-account':account,'./student-profile':profile});
 const grades=load('lib/student-grades.ts');
 const lesson={studentTopics:async id=>id==='CVP-A1'?content:[]};

 async function request(path,user,method='GET',body) {
  const url='https://review.example'+path;
  const headers=new Headers({'oai-authenticated-user-id':user,origin:new URL(url).origin});
  headers.set('X-Review-Account',(await account.reviewAccount(headers)).key);
  return new Request(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 }

 return {request,sqlite,
  lessons:load('app/api/student-lessons/[id]/route.ts',{
   '../../../../lib/review-account':account,'../../../../lib/student-lesson-access':access,'../../../../lib/student-lessons':lesson
  }),
  practice:load('app/api/student-practice/route.ts',{
   '../../../lib/review-account':account,'../../../lib/student-lesson-access':access,'../../../lib/student-lessons':lesson
  }),
  grades:load('app/api/student-grades/route.ts',{...cloud,'../../../lib/review-account':account,'../../../lib/student-grades':grades}),
  assets:load('app/api/site-assets/[...path]/route.ts',{...cloud,
   '../../../../lib/admin-auth':{ownerId:headers=>headers.get('oai-authenticated-user-id')==='owner'?'owner':null},
   '../../../../lib/student-lesson-access':access,'../../../../lib/site-assets':{serveAsset:()=>new Response('fixture')}
  })
 };
}

test('assigned lessons withhold keys until grading and keep student answers separate',async t=>{
 const {lessons,request,sqlite}=fixture(t);
 const params=id=>({params:Promise.resolve({id})});
 const get=async(id,user)=>lessons.GET(await request('/api/student-lessons/'+id,user),params(id));
 assert.equal((await get('CVP-A2','student-a')).status,403);
 assert.equal((await get('CVP-A1','owner')).status,403);
 const lesson=await (await get('CVP-A1','student-a')).json();
 assert.equal(lesson.topics[0].questions[0].answer,undefined);
 assert.equal(lesson.topics[0].questions[0].reasons,undefined);
 const post=body=>request('/api/student-lessons/CVP-A1','student-a','POST',body).then(req=>lessons.POST(req,params('CVP-A1')));
 assert.equal((await post({topicId:'topic',choices:{fixture:4}})).status,400);
 const score=await (await post({topicId:'topic',choices:{fixture:1},userId:'owner'})).json();
 assert.equal(score.results[0].correct,true);
 assert.equal(score.results[0].answer,1);
 assert.deepEqual((await (await get('CVP-A1','student-b')).json()).answers,[]);
 assert.equal(sqlite.prepare('SELECT user_id FROM review_student_answers').get().user_id,'student-a');
});

test('timed practice is account-scoped, idempotent and expires',async t=>{
 const {practice,request,sqlite}=fixture(t);
 const post=(user,body)=>request('/api/student-practice',user,'POST',body).then(practice.POST);
 assert.equal((await post('student-a',{action:'start',lectureIds:['CVP-A2'],count:1,minutes:10})).status,400);
 const start=async()=> (await post('student-a',{action:'start',lectureIds:['CVP-A1'],count:1,minutes:10})).json();
 const run=await start();
 assert.equal(run.questions[0].answer,undefined);
 const submit={action:'submit',id:run.id,choices:{fixture:1}};
 assert.equal((await post('student-b',submit)).status,404);
 assert.equal((await (await post('student-a',submit)).json()).correct,1);
 assert.equal((await (await post('student-a',{...submit,choices:{fixture:0}})).json()).correct,1);
 const late=await start();
 sqlite.prepare('UPDATE review_student_practice SET expires_at=0 WHERE id=?').run(late.id);
 const result=await (await post('student-a',{...submit,id:late.id})).json();
 assert.equal(result.expired,true);
 assert.equal(result.correct,0);
});

test('grade records and shared file access use the signed-in account',async t=>{
 const {grades,assets,request}=fixture(t);
 const url='/api/student-grades';
 const rows={CVP:[{name:'Assessment',weight:20,total:100,earned:90}]};
 assert.equal((await grades.PUT(await request(url,'student-a','PUT',{grades:rows,revision:0}))).status,200);
 assert.deepEqual((await (await grades.GET(await request(url,'student-a'))).json()).grades,rows);
 assert.deepEqual((await (await grades.GET(await request(url,'student-b'))).json()).grades,{});
 assert.equal((await grades.PUT(await request(url,'student-a','PUT',{grades:{},revision:0}))).status,409);
 const asset=async(path,user)=>assets.GET(await request('/api/site-assets/'+path,user),{params:Promise.resolve({path:path.split('/')})});
 assert.equal((await asset('materials/cvp-slides-a1.pdf','student-a')).status,200);
 assert.equal((await asset('materials/another.pdf','student-a')).status,404);
 assert.equal((await asset('materials/another.pdf','owner')).status,200);
});

test('grade forecasts distinguish unknown question weights and explicit equal-mark assumptions',()=>{
 const {gradeForecast,validGrades}=load('lib/student-grades.ts');
 const rows=[{name:'Midterm',weight:40,total:50,earned:40},{name:'Final',weight:60,total:100,earned:null,questions:100,equalMarks:true}];
 assert.equal(validGrades({CVP:rows}),true);
 assert.equal(gradeForecast(rows,85).maximum,92);
 assert.equal(gradeForecast(rows,85).wrongAllowed[1],11);
 assert.equal(gradeForecast(rows,95).wrongAllowed[1],null);
 assert.equal(gradeForecast([rows[0],{...rows[1],equalMarks:false}],85).wrongAllowed[1],null);
});
