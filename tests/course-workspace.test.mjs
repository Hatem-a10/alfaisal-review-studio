import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renalSessions,workspaceRoute} from '../public/course-workspace-core.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const timetable=JSON.parse(read('public/group-timetables.json'));

test('archived and current workspace bookmarks use distinct routes',()=>{
 assert.deepEqual(workspaceRoute('#archive'),{course:'CVP',view:'index'});
 assert.deepEqual(workspaceRoute('#archive/booklet'),{course:'CVP',view:'booklet'});
 assert.deepEqual(workspaceRoute('#renal/learning'),{course:'REN',view:'learning'});
 assert.deepEqual(workspaceRoute('#mol/practice'),{course:'MOL',view:'practice'});
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
 const {bookletSections,renalGuides}=await import('../public/renal-study.mjs');
 const resources=JSON.parse(read('public/renal-materials.json'));
 assert.equal(resources.length,10);
 assert.equal(new Set(resources.map(resource=>resource.sha)).size,10);
 for(const source of resources){
  assert.match(source.path,/^materials\/ren123\/[a-z0-9-]+\.(pdf|pptx)$/);
  assert.match(source.sha,/^[0-9a-f]{64}$/);
  assert.ok(source.size>0&&source.units>0);
 }
 for(const guide of renalGuides){
  const source=resources.find(item=>item.id===guide.source);
  assert.ok(source.sessions.includes(guide.code));
  assert.ok(guide.topics.every(topic=>topic.page>=1&&topic.page<=source.units&&topic.question&&topic.answer));
 }
 const booklet=resources.find(source=>source.kind==='booklet');
 assert.equal(booklet.units,294);
 assert.deepEqual(bookletSections.map(([kind])=>kind),['MCQs','SAQs','OSPE']);
 assert.ok(bookletSections.flatMap(([,sections])=>sections).every(([,page])=>page>=3&&page<=booklet.units));
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
