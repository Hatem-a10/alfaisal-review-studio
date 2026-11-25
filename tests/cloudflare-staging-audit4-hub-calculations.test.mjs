import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const hub=runInNewContext(readFileSync(new URL('../public/hub-domain.js',import.meta.url),'utf8')+'\nHubDomain',{});
const row={id:'a',weight:100,total:100,earned:80,completed:true};
test('classic grades reject absent marks, invalid weights, duplicate IDs and invalid targets',()=>{
 for(const earned of [null,'',true,'  '])assert.equal(hub.grades([{...row,earned}]).valid,false);
 for(const weight of [null,'',false])assert.equal(hub.grades([{...row,weight}]).valid,false);
 assert.equal(hub.grades([{...row,weight:50},{...row,weight:50}]).valid,false);
 for(const target of [-1,101,true,null,Infinity])assert.equal(hub.grades([row],target).valid,false);
 assert.equal(hub.grades([{...row,earned:'80'}]).contribution,80);
});
test('zero-weight assessments and nonintegral question counts do not produce invalid allowances',()=>{
 const result=hub.grades([{...row,weight:60},{id:'zero',weight:0,total:20,completed:false},{id:'next',weight:40,total:50,questions:2.5,equalMarks:true}],65);
 assert.equal(result.exams[0].requiredRaw,null);
 assert.equal(result.exams[1].wrong,null);
 assert.ok(Number.isFinite(result.exams[1].requiredRaw));
});
test('countdowns recognize single-digit and explicit 12-hour start clocks and reject invalid clocks',()=>{
 const date='2026-12-20',now=Date.parse(date+'T00:00:00+03:00');
 for(const [detail,time] of [['9:15 – 12:00','09:15'],['9:15 PM to 10:00 PM','21:15'],['12:00 AM','00:00'],['12:00 PM','12:00'],['09:00 · Room A','09:00']]){
  const t=hub.countdown({date,detail},now);assert.equal(t.time,time);assert.equal(t.assumed,false);assert.ok(Number.isFinite(t.seconds));
 }
 for(const detail of ['99:00','09:60','13:00 PM'])assert.equal(hub.countdown({date,detail},now).known,false);
 const assumed=hub.countdown({date,detail:'Room A'},now);assert.equal(assumed.assumed,true);assert.equal(assumed.time,'08:00');
});
test('past countdowns display elapsed time since the true start',()=>{
 const date='2026-12-20',now=Date.parse('2026-12-21T00:00:00Z'),a=hub.countdown({date,detail:'09:00'},now),b=hub.countdown({date,detail:'12:00'},now);
 assert.equal(a.seconds,18*3600);assert.equal(b.seconds,15*3600);assert.ok(a.startAt<b.startAt);assert.equal(a.text,'00 : 18 : 00 : 00');assert.equal(a.past,true);
});
test('activity counts only finite positive session durations and tolerates malformed rows',()=>{
 const at='2026-11-24T08:00:00Z',records={bad:null,broken:{learning:{attempts:{}},mcqs:{},sessions:{}},a:{sessions:[null,{id:'1',endedAt:at,seconds:60},{id:'2',endedAt:at,seconds:Infinity},{id:'3',endedAt:at,seconds:'bad'},{id:'4',endedAt:at,seconds:0},{id:'5',endedAt:at,seconds:-60}]}};
 const values=Object.values(hub.activity(records));
 assert.equal(values.length,1);assert.equal(values[0].minutes,1);
 assert.equal(Object.keys(hub.activity({a:{sessions:[{id:'z',endedAt:at,seconds:0}]}})).length,0);
});
test('current-period highlighting requires actual finite start and end values',()=>{
 const date='2026-11-24';
 assert.equal(hub.active({date,start:null,end:600},date,500),false);
 assert.equal(hub.active({date,start:450,end:600},date,500),true);
 assert.equal(hub.active({date,start:450,end:600},date,600),false);
});
