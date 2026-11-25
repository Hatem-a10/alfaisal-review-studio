import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {analytics,mergePractice,selectBooklet,advanceBooklet} from '../public/phase2-practice-core.mjs';
import {deduplicateQuestions,nearDuplicate} from '../public/phase2-question-quality.mjs';
import {pacingSummary} from '../public/phase2-pacing.mjs';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const engine=runInNewContext(read('exam-engine.js')+'\nExamEngine');
const source=read('exam-tools.js');
const question=(id='q',lecture='MOL-1')=>({id,lectureIds:[lecture],question:'Question '+id,options:['a','b'],answer:0,explanation:'Why',reasons:['A','B'],kind:'Lecture application'});
test('saved exam restoration keeps valid answers and repairs invalid flag and answer maps',()=>{
 const q=question(),e={id:'one',deadline:Date.now()+10000,questions:[q],answers:{0:0,1:1,'00':1,other:0},flags:{0:true,1:true,other:true}};
 const result=engine.restore(e);assert.equal(JSON.stringify(result.answers),'{"0":0}');assert.equal(JSON.stringify(result.flags),'{"0":true}');
 assert.equal(engine.restore({...e,questions:[]}),null);assert.equal(engine.restore({...e,answers:[]}),null);assert.equal(engine.restore({...e,flags:null}).flags[0],undefined);
});
test('exam pools preserve Unicode, distinct figure questions and ordinary course coverage',()=>{
 const a={...question('a'),question:'Which receptor is α?'},b={...question('b'),question:'Which receptor is β?'};
 const c={...question('c'),question:'Identify this structure',image:'/one.png'},d={...c,id:'d',image:'/two.png'};
 assert.equal(engine.pool([a,b,c,d],'MOL','all','all').length,4);
 assert.equal(deduplicateQuestions([a,b,c,d]).length,4);
 assert.equal(nearDuplicate(c,d),false);assert.equal(nearDuplicate(c,{...c,options:['different','options']}),false);
});
test('mock bank includes ordinary course questions and restricts original questions to selected mix',()=>{
 const code=source.slice(source.indexOf('function phase2MockPool('),source.indexOf('function etMockPanel('));
 const context={etMockScope:'MOL',etAccurate:false,ExamEngine:engine,LEARNING:{sources:[]},ORIGINAL_EXAMS:{sources:[],questions:[question('original1','MOL-1'),question('original2','MOL-2')]},mixBank:()=>[question('bank1','MOL-1'),question('bank2','MOL-2')],lessonMix:{mock:{enabled:false,ids:[]}},MockSources:{choices:()=>({booklet:true}),groups:()=>[],filter:(qs,course)=>qs.filter(q=>q.lectureIds.every(id=>id.startsWith(course+'-')))},window:{}};
 const mix=readFileSync(new URL('../public/lesson-mix-controls.js',import.meta.url),'utf8');
 const filter=mix.slice(mix.indexOf('function mockLessonSelection'),mix.indexOf('function mixSelected'));
 const pool=runInNewContext(code+'\n'+filter+'\nphase2MockPool',context);
 assert.equal(pool().length,4);context.lessonMix.mock={enabled:true,ids:['MOL-2']};assert.deepEqual(Array.from(pool(),q=>q.id).sort(),['bank2','original2']);
 context.lessonMix.mock.ids=[];assert.equal(pool().length,0);
});
test('overlapping starts cannot overwrite an exam and stale selections do not launch it',async()=>{
 const code=source.slice(source.indexOf('async function etLaunchMock('),source.indexOf('function etCancelExam()'));
 let release;const wait=new Promise(r=>release=r),fields={etMockCount:{value:'1'},etMockMinutes:{value:'60'},etStartMock:{disabled:false}},toasts=[],created=[];
 const ctx={etStartingMock:false,etExam:null,etMockCount:1,etMockMinutes:60,etMockScope:'MOL',etMockType:'exam',etAccurate:false,etPracticeTab:'mock',view:'practice',reviewCourseScope:'MOL',lessonMix:{mock:{enabled:false,ids:[]}},phase2CheatPreference:()=>false,$:s=>fields[s.slice(1)],MockSources:{choices:()=>({booklet:true})},window:{reviewMockBookletStatus:()=>'ready',reviewLoadMockBooklet:()=>wait,Phase2Practice:{recordMock:x=>created.push(x)}},ExamEngine:engine,phase2MockPool:()=>[question()],crypto:{randomUUID:()=> 'synthetic'},toast:m=>toasts.push(m),etSaveExam(){},render(){},etTick(){},etRetrySnapshot:()=>true};
 const launch=runInNewContext(code+'\netLaunchMock',ctx);
 const first=launch(fields.etStartMock);assert.equal(await launch(fields.etStartMock),false);fields.etMockCount.value='2';release(true);
 assert.equal(await first,false);assert.equal(created.length,0);assert.equal(ctx.etStartingMock,false);
 fields.etMockCount.value='1';assert.equal(await launch(fields.etStartMock),true);assert.equal(created.length,1);assert.equal(await launch(fields.etStartMock),false);assert.equal(created.length,1);
});
test('completed run beats a stale active snapshot and epoch timestamps are sorted chronologically',()=>{
 const q=question(),active={id:'run',startedAt:2000000000000,questions:[q],answers:{}},done={...active,finishedAt:'2033-05-18T03:33:25Z',answers:{0:0}};
 const old={mocks:[{id:'run',createdAt:2000000000000,updatedAt:'2033-05-19T00:00:00Z',snapshot:active,attempts:[active]}]},complete={mocks:[{id:'run',createdAt:2000000000000,updatedAt:'2033-05-18T00:00:00Z',snapshot:done,attempts:[done]},{id:'earlier',createdAt:1000000000000,snapshot:{...active,id:'earlier'}}]};
 const result=mergePractice(old,complete);assert.deepEqual(result.mocks.map(x=>x.id),['earlier','run']);assert.equal(result.mocks[1].snapshot.finishedAt,done.finishedAt);assert.equal(result.mocks[1].snapshot.answers[0],0);
});
test('analytics ignores out-of-range choices and duplicate lecture memberships',()=>{
 const q={...question(),lectureIds:['MOL-1','MOL-1']};const m={finishedAt:'now',questions:[q,q],answers:{0:0,1:999}};
 assert.deepEqual(analytics({},[{snapshot:m}],[q]),[{id:'MOL-1',correct:1,total:1,accuracy:1}]);
});
test('booklet normalizes fractional saved position and keeps empty filtered navigation valid',()=>{
 const qs=[{id:'a',type:'mcq'},{id:'b',type:'mcq'}];assert.equal(selectBooklet(qs,{position:1.8}).question.id,'b');
 const state={filter:'completed',bookletViewId:'a',position:0};advanceBooklet(qs,state);assert.equal(state.position,0);
});
test('pacing does not allow non-finite time or fractional switches to contaminate metrics',()=>{
 const result=pacingSummary({questions:[{},{}],xp:{activeMs:{0:Infinity,1:2000},rightToWrong:{0:2.9,1:Infinity}}});assert.equal(result.totalMs,2000);assert.equal(result.averageMs,2000);assert.equal(result.switches,2);
});
test('exam keyboard handler is scoped to active view and full choice number range',()=>{
 const s=read('examplify-mode.js');assert.match(s,/function active\(\)\{return view==='practice'/);
 assert.match(s,/\[1-8\]/);assert.match(s,/data-xp-written'\)\)\{if\(remaining\(\)<=0\)/);
 assert.match(source,/if\(!etRetrySnapshot\(\)\)return/);assert.match(read('phase2-practice.mjs'),/cancelMock\(exam\)/);
});

test('cancel refuses to discard current answers until saved cancellation succeeds',()=>{
 const line=source.split('\n').find(l=>l.startsWith('function etCancelExam(')),attempt={id:'active',answers:{0:1}},ctx={etExam:attempt,confirm:()=>true,window:{Phase2Practice:{cancelMock:()=>false}},toast(){},etSaveExam(){},render(){},etTick(){}};
 const cancel=runInNewContext(line+'\netCancelExam',ctx);assert.equal(cancel(),false);assert.equal(ctx.etExam,attempt);
 ctx.window.Phase2Practice.cancelMock=()=>true;assert.equal(cancel(),true);assert.equal(ctx.etExam,null);
});
test('original grading rejects invalid choices and incomplete deferred banks cannot trigger low-score deletion',()=>{
 const s=read('original-exams.js'),a=s.split('\n').find(l=>l.startsWith('function originalGrade(')),b=s.split('\n').find(l=>l.startsWith('function originalLowScore('));
 const q={...question('valid'),type:'mcq'},ctx={ORIGINAL_EXAMS:{questions:[q,{...question('invalid'),type:'mcq',answer:99}]}};
 const funcs=runInNewContext(a+'\n'+b+'\n({originalGrade,originalLowScore})',ctx);
 const run={ids:['valid','invalid','deferred'],answers:{valid:99,invalid:99},finishedAt:'2026-11-24T00:00:00Z'};
 const grade=funcs.originalGrade(run);assert.equal(grade.keyed,1);assert.equal(grade.answered,0);assert.equal(grade.correct,0);assert.equal(funcs.originalLowScore(run),false);
 assert.equal(funcs.originalLowScore({...run,ids:['valid','invalid']}),true);
});
