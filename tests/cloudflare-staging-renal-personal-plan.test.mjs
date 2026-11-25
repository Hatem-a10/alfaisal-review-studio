import test from 'node:test';
import assert from 'node:assert/strict';
import {renalPlanPreview} from '../public/study-next-core.mjs';
const items=['A1','P1','P2','A2'].map(code=>({id:'REN-'+code,course:'REN',title:code,dates:[]}));
const event=(title,date,group='M1',end=600)=>({title,date,course:'REN',kind:title.startsWith('A')?'anatomy':'physiology',studentGroups:[group],end});
const assessment=(title,date)=>({title,date,course:'REN',kind:'assessment',studentGroups:['M1','M2']});
const events=[event('A1','2026-11-22'),event('P1','2026-11-25','M1',800),event('P2','2026-11-22','M2'),event('A2','2026-11-23'),assessment('REN 123 final exam','2026-12-16'),assessment('REN 123 OSPE','2026-12-17')];
const inputs={events,date:'2026-11-25',minute:700,group:'M1',section:'A',minutes:90};
test('plan is opt-in, only considers group-released unscheduled lessons and never changes original records',()=>{
 const records={'REN-A2':{dates:['2026-11-20','2026-11-22','2026-11-28'],notes:'keep'}};
 const result=renalPlanPreview(items,records,inputs);
 assert.deepEqual(result.plans.map(x=>x.id),['REN-A1']);
 assert.deepEqual(result.notReleased,['REN-P1','REN-P2']);
 assert.deepEqual(result.plans[0].dates,['2026-11-25','2026-11-26','2026-11-28']);
 assert.equal(result.final,'2026-12-16');assert.equal(result.ospe,'2026-12-17');
 assert.equal(records['REN-A1'],undefined);assert.equal(records['REN-A2'].notes,'keep');
});
test('existing study load and user blocked days are respected; completed passes retain dates',()=>{
 const result=renalPlanPreview(items.slice(0,1),{'REN-A1':{done:{0:'2026-11-22T09:00:00Z'}}},{...inputs,minutes:40,tasks:[{date:'2026-11-25',p:0,done:null}],blockedDates:['2026-11-26']});
 assert.deepEqual(result.plans[0].dates,['2026-11-22','2026-11-27','2026-11-29']);
});
test('impossible schedules do not fabricate today placeholders or consume capacity',()=>{
 const near=[...events.filter(x=>x.kind!=='assessment'),assessment('REN final','2026-11-26')];
 const result=renalPlanPreview(items,{}, {...inputs,events:near,minutes:90});
 assert.equal(result.plans.length,0);assert.deepEqual(result.unplaced,['REN-A1','REN-A2']);
 assert.ok(renalPlanPreview(items,{}, {...inputs,group:''}).error);
});
