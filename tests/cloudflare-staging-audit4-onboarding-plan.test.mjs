import test from 'node:test';
import assert from 'node:assert/strict';
import {planStudent} from '../public/onboarding-plan.mjs';
const now='2026-11-24T10:00:00Z',start='2026-11-24';
const item=id=>({id,course:'MOL'});
test('retained existing tasks reserve capacity before new tasks regardless of item order',()=>{
 const records={old:{dates:[start,'2026-11-26','2026-11-28'],done:{}}};
 const result=planStudent([item('new'),item('old')],records,now,{}, {budget:40});
 assert.equal(result.records.new.dates[0],'2026-11-25');assert.deepEqual(result.records.old,records.old);
});
test('invalid selection values cannot mark a review as completed',()=>{
 const result=planStudent([item('a')],{},now,{a:[true,'','0x1',null,'2',2]});
 assert.deepEqual(Object.keys(result.records.a.done),['2']);
});
test('duplicate and invalid item identities cannot allocate tasks twice or pollute state',()=>{
 const result=planStudent([item('a'),item('a'),null,item('__proto__')],{},now,{}, {budget:40});
 assert.deepEqual(Object.keys(result.records),['a']);assert.equal(result.warnings.length,0);
});
test('invalid constraints fall back safely and existing malformed dates are not replaced',()=>{
 const records={old:{dates:'unreadable',done:{0:'unreadable'}}};
 const result=planStudent([item('old'),item('new')],records,now,{}, {budget:'',breaks:[null,['2026-02-30','2026-11-24']],blockedDates:{},finals:{MOL:'bad'}});
 assert.deepEqual(result.records.old,records.old);assert.equal(result.records.new.dates[0],start);
});
test('partially allocated but unscheduled renal review does not reserve phantom capacity',()=>{
 const result=planStudent([{id:'REN-A1',course:'REN'},item('b')],{},now,{}, {budget:40,finals:{REN:'2026-11-25'}});
 assert.deepEqual(result.records['REN-A1'].dates,[]);assert.equal(result.records.b.dates[0],start);
});
test('review dates cannot extend beyond one common planning horizon',()=>{
 const result=planStudent([item('a')],{},now,{}, {budget:40,breaks:[[start,'2027-11-22']]});
 assert.equal(result.records.a.dates[0],'2027-11-23');assert.equal(result.records.a.dates[1],'2027-11-24');assert.equal(result.warnings.length,1);assert.equal(result.warnings[0].pass,2);
});
test('a completed bootstrap pass retains its existing date instead of rewriting it to today',()=>{
 const a={id:'a',course:'MOL',dates:['2026-11-01','2026-11-02','2026-11-03']},records={a:{dates:['2026-11-01','2026-11-25','2026-11-03'],done:{0:'2026-11-01T12:00:00Z'}}};
 const r=planStudent([a],records,now,{}, {bootstrapChanges:[{id:'a',field:'dates.1',after:'2026-11-25'}]});
 assert.equal(r.records.a.dates[0],'2026-11-01');assert.equal(r.records.a.done[0],records.a.done[0]);
});
