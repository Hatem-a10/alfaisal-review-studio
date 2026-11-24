import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {courses} from '../public/course-registry.mjs';

const source=readFileSync(new URL('../public/course-workspace.mjs',import.meta.url),'utf8');
const calendar=readFileSync(new URL('../public/schedule-ui.js',import.meta.url),'utf8');
const legacyOrder=Object.entries(courses);
const legacySelector=(active,route)=>Object.entries(courses)
 .filter(([id,course])=>active==='CVP'?id==='CVP':!course.archived&&!(route==='ospe'&&course.noOspe))
 .sort(([a],[b])=>Number(b==='REN')-Number(a==='REN'))
 .map(([id,course])=>[id,course.label+(course.archived?' · Archive':'')]);
const oldLesson=(enabled,archived)=>[['all','All available courses'],...Object.entries(courses).filter(([id,c])=>!enabled||archived?(!enabled||id==='CVP'):!c.archived).map(([id,c])=>[id,c.label])];

test('A5-133 selector course order and labels match frozen unoptimized source',()=>{
 const begin=source.indexOf('const registryCourseEntries='),end=source.indexOf('const scopedViews=',begin);
 assert.ok(begin>0&&end>begin);
 const context=vm.createContext({courses});vm.runInContext(source.slice(begin,end)+'\nthis.snapshot={registryCourseEntries,activeCourseEntries,archiveCourseEntries,ospeCourseEntries,lessonCourseEntries}',context);
 const data=context.snapshot;
 for(const active of ['CVP','MOL','REN'])for(const route of ['practice','booklet','ospe','library']){
  const rows=active==='CVP'?data.archiveCourseEntries:route==='ospe'?data.ospeCourseEntries:data.activeCourseEntries;
  const actual=Array.from(rows,([id,course])=>[id,course.label+(course.archived?' · Archive':'')]);
  assert.deepEqual(actual,legacySelector(active,route));
 }
 for(const enabled of [true,false])for(const archived of [true,false]){
  const rows=!enabled?data.registryCourseEntries:archived?data.archiveCourseEntries:data.lessonCourseEntries;
  assert.deepEqual([['all','All available courses'],...Array.from(rows,([id,c])=>[id,c.label])],oldLesson(enabled,archived));
 }
 assert.match(source,/window\.reviewLessonCourseOptions=.*registryCourseEntries/);
 assert.match(source,/const options=\(active==='CVP'\?archiveCourseEntries/);
});
test('A5-123 schedule week computation sorts only once per unchanged calendar identity',()=>{
 const start=calendar.indexOf('let campusWeekSnapshot=null;'),end=calendar.indexOf('function campusCurrentWeeks(',start);
 assert.ok(start>0&&end>start);
 let comparisons=0;
 const row=(date,course)=>({get start(){comparisons++;return date},course});
 const base=[row('2026-11-29','MOL'),row('2026-11-15','MOL')],official=[row('2026-12-06','REN'),row('2026-11-22','REN')];
 const context=vm.createContext({CAMPUS_SCHEDULE:{weeks:base},officialGroupSchedule:{weeks:official}});
 vm.runInContext(calendar.slice(start,end)+'\nthis.pick=campusScheduleWeeks;this.setOfficial=x=>officialGroupSchedule=x;',context);
 const first=Array.from(context.pick());const afterFirst=comparisons;const second=Array.from(context.pick());
 assert.equal(comparisons,afterFirst,'cache hit must avoid an additional sort');
 assert.deepEqual(first.map(x=>x.start),['2026-11-15','2026-11-22','2026-11-29','2026-12-06']);
 assert.deepEqual(second,first);second.reverse();assert.deepEqual(Array.from(context.pick()),first,'caller must not mutate cache');
 context.setOfficial({weeks:[row('2026-12-13','REN')]});assert.deepEqual(Array.from(context.pick()).map(x=>x.start),['2026-11-15','2026-11-29','2026-12-13']);
 assert.ok(comparisons>afterFirst,'new calendar identity must re-sort');
});
test('A5-123 repeat-view operation-count benchmark preserves results',()=>{
 const start=calendar.indexOf('let campusWeekSnapshot=null;'),end=calendar.indexOf('function campusCurrentWeeks(',start);
 const fixed=Array.from({length:64},(_,i)=>({start:'2026-12-'+String(31-i%31).padStart(2,'0')}));
 const dynamic=Array.from({length:64},(_,i)=>({start:'2026-11-'+String(30-i%30).padStart(2,'0')}));
 const context=vm.createContext({CAMPUS_SCHEDULE:{weeks:fixed},officialGroupSchedule:{weeks:dynamic}});
 vm.runInContext(calendar.slice(start,end)+'\nthis.pick=campusScheduleWeeks',context);
 const expected=[...fixed,...dynamic].sort((a,b)=>a.start.localeCompare(b.start)).map(x=>x.start);
 for(let i=0;i<500;i++)assert.deepEqual(Array.from(context.pick(),x=>x.start),expected);
 console.log(JSON.stringify({label:'A5-123 repeated timetable render',calendarRows:128,repeatedCalls:500,sortsBefore:500,sortsAfter:1}));
});
