import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renalSessions,workspaceRoute,isCvpStudyItem} from '../public/course-workspace-core.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const timetable=JSON.parse(read('public/group-timetables.json'));

test('archived and current workspace bookmarks use distinct routes',()=>{
 assert.deepEqual(workspaceRoute('#archive'),{course:'CVP',view:'index'});
 assert.deepEqual(workspaceRoute('#archive/booklet'),{course:'CVP',view:'booklet'});
 assert.deepEqual(workspaceRoute('#renal/learning'),{course:'REN',view:'learning'});
 assert.deepEqual(workspaceRoute('#mol/practice'),{course:'MOL',view:'practice'});
 assert.deepEqual(workspaceRoute('#mol/booklet'),{course:'MOL',view:'booklet'});
 for(const hash of ['#archive/planner','#archive/countdowns','#renal/grades','#archive/learning/stale'])assert.equal(workspaceRoute(hash),null);
});

test('Renal workspace uses distinct, exact official sessions for the student group',()=>{
 const assigned=event=>event.studentGroups.includes('M1')&&(!event.studentSection||event.studentSection==='A');
 const lectures=renalSessions(timetable.events,assigned,['anatomy','physiology']);
 const labs=renalSessions(timetable.events,assigned,['lab']);
 assert.ok(lectures.length>5&&labs.length>0);
 assert.ok(lectures.some(event=>event.title==='A1'&&event.detail.includes('Posterior abdominal wall')));
 assert.ok(labs.every(event=>event.studentSection!=='B'));
 assert.ok([...lectures,...labs].every(event=>event.course==='REN'&&event.cell&&timetable.events.includes(event)));
 assert.equal(new Set(lectures.map(event=>event.title+'|'+event.detail)).size,lectures.length);
});

test('question pack data are outside the startup initializer and awaited on entry to practice',()=>{
 assert.doesNotMatch(read('public/phase1-runtime.mjs'),/faculty-questions|tbl19-runtime/);
 assert.match(read('public/phase2-runtime.mjs'),/faculty-questions\.mjs'\)\.then\(module=>module\.loadFacultyQuestions\(\)\)/);
 assert.match(read('public/phase2-runtime.mjs'),/tbl19-runtime\.mjs'\)\.then\(module=>module\.loadTbl19\(\)\)/);
 assert.match(read('scripts/client-scripts.mjs'),/rel="preload" as="script" href="\/'\+url/);
});

test('Renal guides and booklet links resolve to distinct protected sources and valid locators',async()=>{
 const {bookletSections}=await import('../public/renal-study.mjs');
 const {renalLessons,renalTeachingPack}=await import('../public/renal-lessons.mjs');
 const resources=JSON.parse(read('public/renal-materials.json'));
 assert.equal(resources.length,29);
 assert.equal(new Set(resources.map(resource=>resource.sha)).size,resources.length);
 const figures=new Set(JSON.parse(read('lib/renal-lesson-figures.json')).map(figure=>'/api/site-assets/'+figure.path));
 for(const source of resources){
  assert.match(source.path,/^materials\/ren123\/[a-z0-9-]+\.(pdf|pptx|docx|txt)$/);
  assert.match(source.sha,/^[0-9a-f]{64}$/);
  assert.ok(source.size>0&&source.units>0);
 }
 const pack=renalTeachingPack();
 assert.deepEqual(pack.items.map(x=>x.id),['REN-A1','REN-A2','REN-A3','REN-A4','REN-A5','REN-A6','REN-P1','REN-P2','REN-P3','REN-P4','REN-P5','REN-P6','REN-P7','REN-P8','REN-TBL1']);
 assert.equal(new Set(pack.questions.map(q=>q.id)).size,pack.questions.length);
 for(const lesson of renalLessons){
  const asset=resources.find(item=>item.id===lesson.source),id='REN-'+lesson.code;
  assert.ok(asset.sessions.includes(lesson.code));
  assert.equal(pack.sources.find(source=>source.lectureIds?.includes(id)).url,'/api/site-assets/'+asset.path);
  assert.ok(pack.guides[id].objectives.length&&pack.guides[id].summary.length);
  for(const topic of pack.guides[id].sections){
   assert.ok((topic.body.length>1||topic.concepts.length>0)&&topic.keyPoints.length);
   assert.ok(topic.references.every(ref=>ref.page>=1&&ref.page<=asset.units));
   if(topic.figure){
    assert.ok(figures.has(topic.figure.image));
    assert.ok(topic.references.some(ref=>ref.source===topic.figure.source&&ref.page===topic.figure.page));
   }
   if(topic.transcriptReview){
    const transcript=resources.find(item=>item.id===topic.transcriptReview.asset);
    assert.ok(transcript?.path.endsWith('.txt')&&transcript.sessions.includes(lesson.code));
    assert.ok(topic.transcriptReview.passages.every(([time,note])=>/^\d\d:\d\d–\d\d:\d\d$/.test(time)&&note));
   }
   const checks=pack.questions.filter(q=>q.concept===topic.id&&q.lectureIds.includes(id));
   assert.ok(checks.length>=5);
   assert.equal(new Set(checks.map(q=>q.question)).size,checks.length);
  }
 }
 for(const q of pack.questions){
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.options).size,4);
  assert.equal(q.options.length,q.reasons.length);
  assert.equal(q.explanation,q.reasons[q.answer]);
 }
 assert.ok(pack.questions.filter(q=>q.adaptedFromBookletId).length>=8);
 for(const q of pack.questions.filter(q=>q.adaptedFromBookletId)){
  assert.equal(q.references[0].source,'ren123-booklet-source');
  assert.equal(q.references[0].page,Number(q.adaptedFromBookletId.match(/-p(\d+)-/)[1]));
 }
 assert.equal(Object.values(pack.guides).flatMap(guide=>guide.sections).filter(topic=>topic.figure).length,36);
 assert.equal(Object.values(pack.guides).flatMap(guide=>guide.sections).filter(topic=>topic.transcriptReview).length,16);
 const booklet=resources.find(source=>source.kind==='booklet');
 assert.equal(booklet.units,294);
 assert.deepEqual(bookletSections.map(([kind])=>kind),['MCQs','SAQs','OSPE']);
 assert.ok(bookletSections.flatMap(([,sections])=>sections).every(([,page])=>page>=3&&page<=booklet.units));
});

test('nephron topics retain the existing questions and score their saved attempts in the new groups',async()=>{
 const {renalTeachingPack}=await import('../public/renal-lessons.mjs');
 const pack=renalTeachingPack(),lesson=pack.lessons.find(item=>item.id==='REN-A6');
 const ids=Array.from({length:6},(_,index)=>'REN-A6-applied-check-'+(index+1));
 assert.deepEqual(lesson.facts.map(fact=>fact.id),['REN-A6-circulation','REN-A6-filtration-flow','REN-A6-jga-hormones']);
 assert.deepEqual(ids.map(id=>pack.questions.find(question=>question.id===id).concept),[
  'REN-A6-circulation','REN-A6-circulation','REN-A6-filtration-flow','REN-A6-circulation','REN-A6-jga-hormones','REN-A6-jga-hormones'
 ]);
 const Learn=runInNewContext(read('public/learn-engine.js')+';Learn');
 const results=Object.fromEntries(ids.map(id=>[id,{c:'REN-A6-applied',ok:true,at:'2026-11-27T12:00:00Z'}]));
 const status=Learn.status(lesson,{learning:{results,read:['REN-A6-applied']}});
 assert.equal(status.answered,6);
 assert.equal(status.known,3);
 assert.equal(status.read,3);
 assert.equal(pack.guides['REN-P3'].sections.flatMap(topic=>topic.concepts).length,5);
 assert.equal(pack.guides['REN-P4'].sections.flatMap(topic=>topic.concepts).length,4);
});

test('Renal and CVP booklet positions merge independently with stable answer IDs',async()=>{
 const {mergePractice}=await import('../public/phase2-practice-core.mjs');
 const older={navigationAt:'2026-11-20',position:8,filter:'all',booklet:{cvp19:{completed:true,at:'2026-11-20'}},
  renalNavigation:{position:3,filter:'wrong',at:'2026-11-22'}};
 const newer={navigationAt:'2026-11-23',position:12,filter:'completed',booklet:{'ren-booklet-p6-q11':{completed:true,at:'2026-11-23'}},
  renalNavigation:{position:1,filter:'all',at:'2026-11-21'}};
 const merged=mergePractice(older,newer);
 assert.equal(merged.position,12);
 assert.equal(merged.filter,'completed');
 assert.deepEqual(merged.renalNavigation,older.renalNavigation);
 assert.deepEqual(Object.keys(merged.booklet),['cvp19','ren-booklet-p6-q11']);
});


test('archive filtering recognizes CVP lecture, exam and material associations',()=>{
 for(const item of [
  {id:'CVP-P6'}, {id:'cvp19-q42'}, {title:'CVP112 TBL'}, {scope:'CVP'},
  {lectureIds:['MOL-4','CVP-A1']}, {url:'/api/site-assets/materials/cvp-booklet.pdf'},
  {references:[{source:'cvp-transcript'}]},
 ])assert.equal(isCvpStudyItem(item),true);
 for(const item of [{id:'MOL-1'}, {id:'REN-P1'}, {lectureIds:['MOL-1','REN-P1']}, {id:'mol18-booklet-p5-q1'}]){
  assert.equal(isCvpStudyItem(item),false);
 }
});

test('MOL booklet keeps a separate cursor through account merges',async()=>{
 const {mergePractice}=await import('../public/phase2-practice-core.mjs');
 const a={position:2,navigationAt:'2026-11-23',molNavigation:{position:9,at:'2026-11-24'},renalNavigation:{position:1,at:'2026-11-21'}};
 const b={position:3,navigationAt:'2026-11-22',molNavigation:{position:4,at:'2026-11-23'},renalNavigation:{position:8,at:'2026-11-22'}};
 const merged=mergePractice(a,b);
 assert.equal(merged.position,2);
 assert.equal(merged.molNavigation.position,9);
 assert.equal(merged.renalNavigation.position,8);
});

test('Renal practicals reuse cited topics without sharing lecture question or progress IDs',async()=>{
 const {renalTeachingPack}=await import('../public/renal-lessons.mjs');
 const {renalLabs}=await import('../public/renal-labs.mjs');
 const {guides,questions,sources}=renalTeachingPack();
 const labs=renalLabs(guides,questions);
 const originalById=new Map(questions.map(q=>[q.id,q]));
 const ids=new Set();
 assert.deepEqual(labs.modules.map(m=>m.category),['dry','histology']);
 for(const lab of labs.modules){
  assert.equal(lab.course,'REN');
  assert.ok(labs.sources.some(s=>s.id===lab.source&&s.url.startsWith('/api/site-assets/')));
  for(const topic of lab.topics){
   assert.ok(!ids.has(topic.id));
   ids.add(topic.id);
   assert.ok(topic.questions.length>=5);
   assert.ok(topic.references.every(ref=>sources.some(s=>s.id===ref.source)));
   for(const q of topic.questions){
    assert.ok(!ids.has(q.id)&&!originalById.has(q.id));
    ids.add(q.id);
    const original=originalById.get(q.id.slice(lab.id.length+1));
    assert.equal(q.reasons[q.answer],q.explanation);
    assert.equal(q.answer,original.answer);
    assert.equal(q.question,original.question);
   }
  }
 }
});
