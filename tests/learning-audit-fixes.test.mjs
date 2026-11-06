import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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
  {id:'full-slide',name:'Thoracic Wall - Dr. Olena (3).pdf',lectureId:item.id},
  {id:'full-transcript',name:'A8. Thoracic Wall Transcript - Adam Elmorsy.pdf',lectureId:item.id},
 ];
 const ctx = {
  DATA:{items:[item]}, LEARNING:{sources:sources.slice(0,1)}, uploads:sources.slice(1),
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

test('A10 and A11 provide five distinct explained core questions per objective', () => {
 const {learning,teaching,checks} = assembledLearning();
 const group = vm.runInNewContext(load('inline-topics.js').split('let inlineLessonCache')[0] + ';InlineTopics.group');
 for (const id of ['CVP-A10','CVP-A11']) {
  const questions = learning.questions.filter(q=>q.lectureIds.includes(id));
  const topics = teaching.guides[id].sections;
  group(topics,questions,checks).forEach((set,i)=>{
   const core = set.filter(q=>!q.duplicateOf);
   assert.ok(new Set(core.map(q=>q.id)).size >= 5, topics[i].id);
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
