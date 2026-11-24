import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const source=read('daily-focus.js');
const today='2026-11-24',task=(course,date,done=false)=>({x:{course,id:course+'-1',code:'1'},date,done,p:0});
function harness(rows){const start=source.indexOf('function reviewCalendarDay('),end=source.indexOf('function datedReviewItem(',start),a=source.indexOf('function compareDatedReviews('),b=source.indexOf('function dayTaskPanels(',a);return runInNewContext(source.slice(start,end)+source.slice(a,b)+'\n({datedReviewBuckets,courseDayTasks})',{day:today,tasks:()=>rows,window:{},esc:String,datedReviewItem:t=>'<article>'+t.x.id+'</article>'})}
test('Renal scheduled tasks appear alongside MOL and unknown future course groups',()=>{
 const rows=[task('REN',today),task('MOL',today),task('NEW',today)],h=harness(rows),html=h.courseDayTasks(rows,'empty');
 assert.match(html,/REN 123/);assert.match(html,/REN-1/);assert.match(html,/MOL 114/);assert.match(html,/NEW-1/);assert.equal(rows[0].x.course,'REN');
});
test('unscheduled and invalid dates are not overdue or due',()=>{
 const rows=[task('REN',''),task('REN',null),task('REN','2026-02-30'),task('REN','2026-11-23'),task('REN',today),task('MOL',today,true)];
 const b=harness(rows).datedReviewBuckets();assert.equal(b.overdue.length,1);assert.equal(b.due.length,1);assert.equal(b.complete.length,1);
});
test('explicitly unscheduled overflow rows still render without date sorting crashes',()=>{
 const rows=[{...task('REN',undefined),unscheduled:true},task('REN',today)];assert.match(harness(rows).courseDayTasks(rows,''),/2 tasks/);
});
test('dashboard includes Renal progress when dates or earned completions exist but excludes archived courses',()=>{
 const src=read('studio-redesign.js'),a=src.indexOf(' function homeCourses()'),b=src.indexOf(' function homeSummary',a),start=source.indexOf('function reviewCalendarDay('),end=source.indexOf('function datedReviewBuckets',start);
 const items=[{course:'MOL',dates:[]},{course:'REN',dates:[today]},{course:'CVP',dates:[today]}];
 const context={DATA:{items},window:{reviewCourseConfig:c=>({unscheduled:c==='REN'}),reviewCourseClosed:()=>false,reviewArchivedStudyItem:x=>x.course==='CVP'},dates:x=>x.dates,completed:x=>x.done||0};
 const courses=runInNewContext(source.slice(start,end)+src.slice(a,b)+'\nhomeCourses',context);
 assert.deepEqual(Array.from(courses()),['MOL','REN']);items[1].dates=[];assert.deepEqual(Array.from(courses()),['MOL']);items[1].done=1;assert.deepEqual(Array.from(courses()),['MOL','REN']);
});
test('calendar enhancement falls back if the underlying agenda markup has changed',()=>{
 assert.match(source,/if\(start<0\)return html/);assert.match(read('workspace-refinements.js'),/sort\(compareDatedReviews\)/);
});
