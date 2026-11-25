import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withMaterialLectureLinks} from '../lib/material-lecture-links.ts';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

const load = name => fs.readFileSync('public/' + name, 'utf8');

test('library resolves correct start pages on shared decks and separates source notes from transcripts', () => {
 const find = vm.runInNewContext(load('library-list.js') + ';libraryMaterials');
 const {learning} = assembledLearning();
 const material = id => {
  const lesson = learning.lessons.find(item => item.id === id);
  return find(lesson, lesson, learning.sources);
 };
 assert.equal(material('CVP-A9').slides[0].page, 27);
 assert.equal(material('CVP-A20').slides[0].page, 26);
 assert.equal(material('CVP-P24').slides[0].page, 17);
 assert.equal(material('CVP-P21').transcript[0].page, 20);
 assert.equal(material('MOL-11').slides[0].page, 17);
 assert.equal(material('MOL-16').transcript[0].source.id, 'depth-t-13');
 assert.equal(material('MOL-18').transcript.length, 0);
});

test('topic quizzes honor explicit objectives and keep unmatched legacy questions out of the topic grade', () => {
 const code = load('inline-topics.js').split('let inlineLessonCache')[0];
 const {group} = vm.runInNewContext(code + ';InlineTopics');
 const questions = [{id:'a',concept:'old'}, {id:'b',concept:'artery',objectiveId:'vein'}, {id:'c',concept:'unassigned'}];
 const groups = group([{id:'artery'}, {id:'vein'}], questions, {artery:[questions[0],questions[1]]});
 assert.equal(groups[0].map(q => q.id).join(), 'a');
 assert.equal(groups[1].map(q => q.id).join(), 'b');
});

test('recall waits a full day, excludes seen questions, and records successful recall separately', () => {
 const code = load('retention-check.js').split('function retentionForLesson')[0];
 const state = vm.runInNewContext(code + ';retentionState',{fmt:x=>x,Study:{localDate:x=>x}});
 const now = Date.parse('2026-11-06T12:00:00Z');
 const questions = [{id:'a'}, {id:'b'}, {id:'c'}];
 const answers = new Map([['a',{ok:true,at:'2026-11-05T12:00:00Z'}]]);
 assert.equal(state(questions,answers,[],now-1).question, undefined);
 assert.equal(state(questions,answers,[],now,new Set(['b'])).question.id, 'c');
 assert.equal(state(questions,answers,[{correct:true,at:'2026-11-06T12:00:00Z'}],now).label,'Recalled later');
});

test('practical mastery requires saved visual evidence when an image question exists', () => {
 const core = vm.runInNewContext(load('lab-core.js') + ';LabCore');
 const topic = {id:'histology',questions:[{id:'visual',answer:1,figure:{image:'/slide'}}]};
 assert.equal(core.mastered({mastery:{histology:{at:'2026-11-05'}}},topic),false);
 assert.equal(core.visualPassed(topic.questions,{visual:0}),false);
 assert.equal(core.visualPassed(topic.questions,{visual:1}),true);
 assert.equal(core.mastered({mastery:{histology:{visual:true}}},topic),true);
});

test('isolating several parts intersects the selection with the active preset', () => {
 const code = fs.readFileSync('client/heart-viewer.mjs','utf8').split(' function isolate(')[1].split('\n')[0];
 const meshes = ['wall','valve','vein'].map(structure => ({userData:{structure},visible:true}));
 const isolate = vm.runInNewContext('(function isolate(' + code + ')',{meshes,parts:new Set(['wall','valve']),render(){}});
 isolate(['wall','valve','vein']);
 assert.deepEqual(meshes.map(mesh=>mesh.visible),[true,true,false]);
});

test('lecture rows keep original slide and transcription actions and omit text readers', () => {
 const item = {id:'CVP-A8'};
 const sources = [
  {id:'extract',name:'Thoracic Wall - Dr. Olena.pdf',kind:'Slides',lectureIds:[item.id],url:'#library'},
  {id:'full-slide',name:'Thoracic Wall - Dr. Olena (3).pdf',lectureId:item.id,lectureRanges:{[item.id]:[1,2]}},
  {id:'full-transcript',name:'A8. Thoracic Wall Transcript - Adam Elmorsy.pdf',lectureId:item.id},
 ];
 const ctx = {
  reviewCourseScope:'CVP', DATA:{items:[item]}, LEARNING:{sources:sources.slice(0,1)}, uploads:sources.slice(1),
  lessonById:()=>({}), title:()=> 'Thoracic wall', esc:String,
  sourceTarget:({source,page})=>({url:sources.find(x=>x.id===source).url || '/api/materials/'+source,page}),
  sourcePageURL:({url,page})=>url+'#page='+page,
 };
 const html = vm.runInNewContext(load('library-list.js') + ';libraryLectureLists()',ctx);
 assert.match(html,/api\/materials\/full-slide#page=1[^>]+>Slides/);
 assert.match(html,/api\/materials\/full-transcript#page=1[^>]+>Transcription/);
 assert.doesNotMatch(html,/#library|data-open-page|\(text\)/);
 const match = vm.runInNewContext(load('library-list.js') + ';suppliedLectureForFile');
 assert.equal(match('Lecture 2 Blood Vessel Histology 2026 Fall Dr Ani (3).pptx'),'CVP-A7');
 assert.equal(match('Heart valves and heart sounds - Dr Moni Nader-15102026 (3).pptx'),'CVP-P10');
 assert.equal(match('Unrecognized document.pdf'),undefined);
});

test('A10–A13 provide five distinct explained core questions per objective and four options per question', () => {
 const {learning,teaching,checks} = assembledLearning();
 const group = vm.runInNewContext(load('inline-topics.js').split('let inlineLessonCache')[0] + ';InlineTopics.group');
 for (const id of ['CVP-A10','CVP-A11','CVP-A12','CVP-A13']) {
  const questions = learning.questions.filter(q=>q.lectureIds.includes(id));
  const topics = teaching.guides[id].sections;
  group(topics,questions,checks).forEach((set,i)=>{
   const core = set.filter(q=>!q.duplicateOf);
   assert.ok(new Set(core.map(q=>q.id)).size >= 5, topics[i].id);
   assert.ok(core.every(q=>q.options.length>=4), topics[i].id);
   for (const q of core.filter(q=>q.id.includes(':extra-'))) {
    assert.equal(q.options.length,q.reasons.length);
    assert.equal(q.explanation,q.reasons[q.answer]);
    assert.ok(q.references.every(r=>learning.sources.some(s=>s.id===r.source&&s.pages.some(p=>p.page===r.page))));
   }
  });
 }
});

test('upload queue distinguishes saved, pending and failed files and estimates remaining time', () => {
 const source = load('learning.js').split('function materialQueueMarkup()')[1].split('function updateMaterialQueue')[0];
 const html = vm.runInNewContext('(function materialQueueMarkup()'+source+')()', {
  esc:String, materialQueueStarted:Date.now()-10000, materialQueue:[
   {name:'deck.pdf',lecture:'CVP A10',state:'Saved'},
   {name:'notes.pdf',lecture:'CVP A11',state:'Failed',error:'Storage unavailable'},
   {name:'lecture.pptx',lecture:'CVP A12',state:'Uploading',phase:'Reading slide 3 of 5'},
   {name:'transcript.pdf',lecture:'CVP A13',state:'Queued'},
  ],
 });
 assert.match(html,/1 of 4 saved/);
 assert.match(html,/value="2" max="4"/);
 assert.match(html,/CVP A12 · Reading slide 3 of 5 · about/);
 assert.match(html,/Storage unavailable/);
 assert.match(html,/Queued/);
});

test('adding a question keeps existing draft answers and option order by question ID', () => {
 const source = load('inline-topics.js').split('function inlineSession(l)')[1].split('function inlineLatest')[0];
 const result = vm.runInNewContext('(function inlineSession(l)'+source+')({id:"L"})', {
  inlineSelected:()=>({topic:{id:'T'},questions:[{id:'new',options:['a','b']},{id:'kept',options:['a','b']}]}),
  inlineTopicSessions:new Map(),
  inlineReadDrafts:()=>({'L:T':{ids:['kept'],orders:[[1,0]],answers:{0:1},graded:{0:true}}}),
  ExamEngine:{shuffle:x=>x},
 });
 assert.equal(result.answers[1],1);
 assert.equal(result.graded[1],true);
 assert.equal(result.orders[1].join(','),'1,0');
 assert.equal(result.answers[0],undefined);
});

test('supplemental questions defer past Dashboard and load once for learning and practice', async () => {
 const content = {innerHTML:''};
 let requests = 0, paints = 0;
 const ctx = {
  view:'dashboard',render(){paints++},esc:String,
  document:{getElementById:()=>content,addEventListener(){}},
  LEARNING:{questions:[]},TEACHING:{guides:{}},applyLessonExpansion(){},TOPIC_CHECKS:{},inlineLessonCache:new Map(),
  fetch:async path=>{requests++;return {ok:true,json:async()=>path.includes('supplemental-objective-questions') ? {questions:[{id:'q',objectiveId:'topic',options:['A','B','C','D']}]} : {}}},
 };
 ctx.window=ctx;
 vm.runInNewContext(load('supplemental-objectives.js'),ctx);
 ctx.render();
 assert.equal(requests,0);
 ctx.view='learning';ctx.render();ctx.render();
 assert.equal(requests,4);
 assert.match(content.innerHTML,/Loading your question bank/);
 await new Promise(resolve=>setImmediate(resolve));
 ctx.view='practice';ctx.render();
 assert.equal(requests,4);
 assert.equal(ctx.LEARNING.questions.length,1);
 assert.equal(paints,3);
});

test('checked concept-card quizzes link to the next card at the bottom of the results', () => {
 const code = load('inline-topics.js').split('function inlineQuizMarkup(l)')[1].split('const inlineOriginalReader')[0];
 const session = {questions:[],graded:{},topic:{id:'one',title:'One'},index:0,topics:[{},{}]};
 const score = {complete:false,total:1,correct:0,available:1,percent:0};
 const markup = vm.runInNewContext('(function inlineQuizMarkup(l)'+code+')', {
  inlineSession:()=>session,inlineTopicScore:()=>score,scoreRing:()=>'',esc:String,
  deepMode:'cards',guideFor:()=>({}),
 });
 const html = markup({id:'lesson'});
 assert.ok(html.indexOf('data-inline-jump="1"') > html.indexOf('id="inlineTopicScore"'));
 assert.match(html,/data-unified-card-next>Next card/);
 session.index=1;
 assert.doesNotMatch(markup({id:'lesson'}),/data-unified-card-next/);
 session.index=0;score.total=0;
 assert.doesNotMatch(markup({id:'lesson'}),/data-unified-card-next/);
});

test('every lesson objective has five distinct core questions and the study bank has four choices per question', () => {
 const {learning,teaching,checks} = assembledLearning();
 const core = load('inline-topics.js');
 const group = vm.runInNewContext(core.split('let inlineLessonCache')[0] + ';InlineTopics.group');
 const bank = [...new Map([...Object.values(checks).flat(),...learning.questions].map(q=>[q.id,q])).values()];
 const gaps = [];
 for (const lesson of learning.lessons) {
  const topics = teaching.guides[lesson.id]?.sections || lesson.facts.map(f=>({id:f.id,concept:f.id}));
  const questions = bank.filter(q=>q.lectureIds.includes(lesson.id)&&q.id!=='CVP-P14:w3-renal-signals-q2').map(q=>{
   const objectiveId = q.objectiveByLecture?.[lesson.id];
   return objectiveId ? {...q,objectiveId} : q;
  });
  group(topics,questions,checks).forEach((set,index)=>{
   const stems = new Set(set.filter(q=>!q.duplicateOf).map(q=>q.question.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')));
   if (stems.size<5) gaps.push(topics[index].id+' ('+stems.size+')');
  });
 }
 assert.deepEqual(gaps, []);
 assert.deepEqual(bank.filter(q=>q.options.length<4).map(q=>q.id), []);
});

test('supplemental questions have valid answer keys, choice-specific feedback and resolvable citations', () => {
 const {learning} = assembledLearning();
 const sources = new Map(learning.sources.map(s=>[s.id,new Set(s.pages.map(p=>p.page))]));
 const {questions} = JSON.parse(load('supplemental-objective-questions.json'));
 const ids = new Set();
 for (const q of questions) {
  assert.ok(!ids.has(q.id), q.id);
  ids.add(q.id);
  assert.ok(q.options.length>=4 && new Set(q.options.map(o=>o.trim().toLowerCase())).size===q.options.length, q.id);
  assert.equal(q.options.length,q.reasons.length,q.id);
  assert.ok(q.reasons.every(r=>r.trim().length>0),q.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,q.id);
  assert.equal(q.explanation,q.reasons[q.answer],q.id);
  assert.ok(q.references.length && q.references.every(r=>sources.get(r.source)?.has(r.page)),q.id);
 }
});

test('combined uploaded pulmonary slides appear in both lecture rows with the correct start page',()=>{
 const materials=vm.runInNewContext(load('library-list.js')+';libraryMaterials');
 const source=withMaterialLectureLinks({id:'shared',lectureId:'CVP-P26',name:'7. Shams_P26 and P27_Hypoxemia and V-Q mismatch_(2h) (1).pdf'});
 assert.equal(materials({id:'CVP-P26'},null,[source]).slides[0].page,1);
 assert.equal(materials({id:'CVP-P27'},null,[source]).slides[0].page,7);
 assert.equal(materials({id:'CVP-P28'},null,[source]).slides.length,0);
});

test('topic score uses the full core question count and retains checked-answer accuracy',()=>{
 const source=load('inline-topics.js');
 const calculate=vm.runInNewContext(source.split('function inlineTopicScore')[1].split('\n')[0].replace(/^/,'(function inlineTopicScore')+')',{inlineLatest:()=>new Map()});
 const questions=Array.from({length:5},(_,i)=>({id:String(i)})).concat({id:'optional',duplicateOf:'0'});
 const record={learning:{results:{0:{ok:true},1:{ok:false},optional:{ok:true}}}};
 const score=calculate({id:'lesson'},questions,record);
 assert.equal(score.correct,1);
 assert.equal(score.available,5);
 assert.equal(score.fullPercent,20);
 assert.equal(score.total,2);
 assert.equal(score.percent,50);
 const restored=calculate({id:'lesson'},questions,record,{graded:{2:true,3:true,5:true},answers:{2:1,3:0,5:0}});
 assert.equal(restored.total,4);
 assert.equal(restored.available,5);
});

test('checking a mapped topic question records it under the open lesson',()=>{
 const items=[{id:'first'},{id:'open'}], state={first:{},open:{}};
 const context={state,DATA:{items},rec:x=>state[x.id],today:()=> '2026-11-08',
  etEligibleQuestion:()=>false,persist(){},LEARNING:{lessons:[]},
  Learn:{record:(r,q,choice)=>({results:{[q.id]:{ok:choice===q.answer}}})}};
 const record=vm.runInNewContext(load('exam-engine.js')+'\n'+load('exam-tools.js').split('\n').find(line=>line.startsWith('function etRecordSet'))+';etRecordSet',context);
 const q={id:'mapped',lectureIds:['first','open'],concept:'legacy-concept',objectiveId:'open-topic',options:['A','B','C'],answer:2};
 record([q],[2],'Lesson topic questions',{lessonId:'open'});
 assert.equal(state.open.learning.results.mapped.ok,true);
 assert.equal(state.first.learning,undefined);
});

test('P2 Topic 7 updates the displayed count after a checked correction even with a stale saved answer',()=>{
 const {learning,teaching,checks}=assembledLearning();
 const lesson=learning.lessons.find(row=>row.id==='CVP-P2');
 const topics=teaching.guides[lesson.id].sections;
 const group=vm.runInNewContext(load('inline-topics.js').split('let inlineLessonCache')[0]+';InlineTopics.group');
 const bank=[...new Map([...Object.values(checks).flat(),...learning.questions]
  .filter(q=>q.lectureIds.includes(lesson.id)).map(q=>[q.id,q])).values()];
 const questions=group(topics,bank,checks)[6];
 assert.equal(questions.filter(q=>!q.duplicateOf).length,5);
 const score=load('inline-topics.js').split('\n').find(line=>line.startsWith('function inlineTopicScore'));
 const wrapper=load('study-workflows.js').split('\n').find(line=>line.startsWith('const minBefore='));
 const context={inlineLatest:()=>new Map(),storeOptions:()=>({minimumQuestions:3})};
 const minimum=load('study-workflows.js').split('\n').find(line=>line.startsWith('function minimumCoreQuestions'));
 const calculate=vm.runInNewContext(score+'\n'+minimum+'\n'+wrapper+'\ninlineTopicScore',context);
 const record={learning:{results:{[questions[0].id]:{ok:false}}}};
 const session={graded:{0:true,1:true},answers:{0:questions[0].answer,1:questions[1].answer}};
 const result=calculate(lesson,questions,record,session);
 assert.equal(result.correct,2);
 assert.equal(result.total,2);
 assert.equal(result.fullPercent,40);
 assert.equal(result.complete,false);
 session.graded[2]=true;
 session.answers[2]=questions[2].answer;
 const next=calculate(lesson,questions,record,session);
 assert.equal(next.fullPercent,60);
 assert.equal(next.total,3);
 assert.equal(next.complete,true);
});

test('renamed cardiac slide originals are batch matched and shown as slides',()=>{
 const {match,materials}=vm.runInNewContext(load('library-list.js')+';({match:suppliedLectureForFile,materials:libraryMaterials})');
 const files={
  'A6 - Blood_Supply_of_the_Heart_2026-27_Dr. Akef (2).pdf':'CVP-A6',
  'A7 - Blood Vessel Histology 2026 Fall Dr Ani (4).pptx':'CVP-A7',
  'A8 - Thoracic Wall - Dr. Olena.pdf':'CVP-A8',
  'P6 - Dr Moni Nader 11102026 (3).pptx':'CVP-P6',
  'P11 - Cardiac output Venous return and their regulation- Dr Moni Nader- 18102026 (2).pptx':'CVP-P11',
  'P14 - Cardiac Failure- Dr Moni Nader-21102026 (2).pptx':'CVP-P14',
 };
 for(const [name,id] of Object.entries(files)){
  assert.equal(match(name),id);
  const source={id:'test-original',name,lectureId:id};
  assert.equal(materials({id},null,[source]).slides[0].source,source);
 }
});

test('cardiac teaching figures are linked to their source pages and render on the concept cards',()=>{
 const {learning,teaching}=assembledLearning();
 const context={rec:()=>({}),esc:String,sourceById:id=>learning.sources.find(s=>s.id===id),
  guideParagraphs:()=>'<p>Teaching text</p>',guideList:()=>'',conceptSourceDisclosure:()=>'',topicCardFacts:()=>[]};
 const source=load('learning-ui.js').split('\n')
  .filter(line=>/^function (guideFigure|sectionCard)\(/.test(line)).join('\n');
 const card=load('inline-topics.js').split('\n').find(line=>line.startsWith('function topicConceptCard('));
 const render=vm.runInNewContext(source+'\n'+card+';topicConceptCard',context);
 for(const id of ['CVP-A6','CVP-A7','CVP-A8','CVP-P6','CVP-P11','CVP-P14']){
  const cards=teaching.guides[id].sections;
  const sections=cards.filter(s=>s.figure);
  const unrelated=render({id},{id},cards,cards.findIndex(s=>!s.figure));
  assert.doesNotMatch(unrelated,/<img\b/);
  assert.ok(sections.length,id);
  for(const section of sections){
   const {source,page,image,width,height}=section.figure;
   assert.ok(context.sourceById(source)?.pages.some(row=>row.page===page),section.id);
   assert.ok(width>0&&height>0&&fs.existsSync('public'+image));
   const html=render({id},{id},cards,cards.indexOf(section));
   assert.ok(html.includes('src="'+image+'"'),section.id);
   assert.ok(html.indexOf('src="'+image+'"')>html.indexOf('<p>Teaching text</p>'),section.id);
   assert.equal((html.match(/<img\b/g)||[]).length,1,section.id);
  }
 }
});

test('lecture practice offers a whole-lecture set alongside individual topics',()=>{
 const questions=[{id:'a',lectureIds:['P2'],concept:'a'},{id:'b',lectureIds:['P2'],concept:'b'},
  {id:'c',lectureIds:['P3'],concept:'b'},{id:'invalid',lectureIds:['P2'],concept:'a'}];
 const ctx={etLecture:'P2',etConcept:'',etScope:'CVP',etSet:null,etBank:()=>questions,
  ExamEngine:{usable:q=>q.id!=='invalid'},etLectureOptions:()=>[{id:'P2',code:'P2'}],
  etConceptOptions:()=>[{id:'a',name:'A'},{id:'b',name:'B'}],esc:String,title:x=>x.code,
  etCourseOptions:()=>'',mixControls:()=>''};
 const lines=load('exam-tools.js').split('\n').filter(line=>/^function et(SetQuestions|ConceptPanel)\(/.test(line));
 vm.runInNewContext(lines.join('\n'),ctx);
 assert.match(ctx.etConceptPanel(),/<option value="">All topics<\/option>/);
 assert.equal(ctx.etSetQuestions().map(q=>q.id).join(','),'a,b');
 ctx.etConcept='b';
 assert.equal(ctx.etSetQuestions().map(q=>q.id).join(','),'b');
});
