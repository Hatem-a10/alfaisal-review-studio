import test from 'node:test';
import assert from 'node:assert/strict';
import {catchupPreview,revisionQueue,topicCoverage} from '../public/study-next-core.mjs';
import {courseInventory,unavailableAssets} from '../public/study-course-readiness.mjs';
import {scheduleChanges} from '../lib/schedule-changes.mjs';

test('catch-up prioritizes near assessments and first reviews while preserving completed reviews and official dates',()=>{
 const today='2026-11-24',a={id:'REN-A1',title:'A1'},b={id:'REN-A2',title:'A2'};
 const tasks=[{x:a,p:0,date:today},{x:a,p:1,date:'2026-11-28'},{x:b,p:0,date:today},{x:b,p:2,date:today,done:true}];
 const before=structuredClone(tasks),events=[{date:'2026-11-25',type:'Official exam'}];
 const result=catchupPreview(tasks,{date:today,minutes:25,events,targets:new Map([[b.id,'2026-11-26']])});
 assert.equal(result.selected[0].x,b);
 assert.deepEqual(result.moved,[{id:a.id,title:'A1',pass:0,from:today,to:'2026-11-26'}]);
 assert.deepEqual(tasks,before);
});

test('a revision session uses frozen answer evidence and chooses an unseen question in the exact topic',()=>{
 const old={id:'old',question:'Original stem',options:['x','y'],answer:1,lectureIds:['REN-P1']};
 const next={id:'next',question:'Different stem',options:['x','y'],answer:1,lectureIds:['REN-P1']};
 const written={id:'written',question:'Write an answer',type:'short'};
 const topic={id:'concept',index:1,lectureId:'REN-P1',questions:[old,next]};
 const run={ids:['old','written'],receipt:{questions:[{id:'old',key:0,selected:1}]}};
 const rows=revisionQueue(run,[old,written],[topic]);
 assert.equal(rows.length,1);assert.equal(rows[0].topic,topic);assert.equal(rows[0].next,next);
 assert.deepEqual(topicCoverage([old,written],q=>q.lectureIds?.[0]||null,[old,next]),[
  {topic:'REN-P1',total:1,available:2},{topic:null,total:1,available:0},
 ]);
});

test('course readiness identifies missing content and unregistered IDs, and checks protected asset links with HEAD',async()=>{
 const inventory=courseInventory('REN',{lessons:[{id:'REN-A1'},{id:'REN-unknown'}],booklet:true});
 assert.deepEqual(inventory.unregistered,['REN-unknown']);
 assert.equal(inventory.rows.find(row=>row.view==='labs').count,0);
 assert.equal(inventory.rows.find(row=>row.view==='booklet').count,1);
 const calls=[];
 assert.deepEqual(await unavailableAssets(['/ok','/fail','//untrusted','/ok'],async (url,options)=>{
  calls.push([url,options.method]);return {ok:url==='/ok'};
 }),['//untrusted','/fail']);
 assert.deepEqual(calls,[['/ok','HEAD'],['/fail','HEAD']]);
});

test('schedule alerts disclose only the schedule details permitted to each affected academic group',()=>{
 const before={id:'a',title:'Lab',startTime:'09:00',endTime:'10:00',room:'R1',studentGroup:'M1',studentSection:'A',labGroup:'1.6'};
 const after={...before,startTime:'10:00',endTime:'11:00',room:'R2',labGroup:'1.7'};
 const run=labGroup=>scheduleChanges([before],[after],{studentGroup:'M1',studentSection:'A',labGroup},'2026-11-24');
 assert.equal(run('1.6')[0].previous.room,'R1');assert.equal(run('1.6')[0].next,null);
 assert.equal(run('1.7')[0].previous,null);assert.equal(run('1.7')[0].next.room,'R2');
 assert.deepEqual(run('1.8'),[]);
});
