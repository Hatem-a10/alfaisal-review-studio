import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/retention-check.js',import.meta.url),'utf8');
const q=[{id:'a',options:['one','two'],answer:0},{id:'b',options:['one','two'],answer:1}];
const old='2026-11-20T00:00:00Z',later='2026-11-21T00:00:00Z',now=Date.parse('2026-11-24T00:00:00Z');
const answers=new Map([['a',{at:old,ok:true}]]);
const context={document:{addEventListener(){}},fmt:x=>x,Study:{localDate:x=>x}};
const api=runInNewContext(source+'\n({retentionState,recallRecordsFor,validRecallRecords})',context);
test('delayed recall rejects malformed history without throwing or reporting false mastery',()=>{
 for(const records of [null,{},[null,{question:'b',at:'invalid',correct:true},{question:'b',at:old,correct:'false'}]]){
  assert.equal(api.retentionState(q,answers,records,now).question.id,'b');
 }
});
test('invalid or nonboolean practice evidence cannot unlock delayed recall',()=>{
 for(const attempt of [{ok:true,at:'invalid'},{ok:'false',at:old}]){
  assert.equal(api.retentionState(q,new Map([['a',attempt]]),[],now).label,'Delayed recall');
 }
});
test('recall chronology uses most recent valid record regardless of storage order',()=>{
 const records=[{question:'b',at:later,correct:false},{question:'b',at:old,correct:true}];
 assert.equal(api.retentionState(q,answers,records,now).label,'Delayed recall');
 assert.equal(records[0].at,later);
});
test('new recall records are scoped to lesson and legacy records need matching question IDs',()=>{
 const records=[{topic:'shared',lesson:'other',question:'b',at:old,correct:true},{topic:'shared',question:'other',at:old,correct:true},{topic:'shared',question:'b',at:old,correct:false},{topic:'shared',lesson:'mine',question:'b',at:later,correct:true}];
 const matched=api.recallRecordsFor({id:'mine'},{id:'shared'},q,records);
 assert.equal(matched.length,2);assert.equal(matched[0].correct,false);assert.equal(matched[1].lesson,'mine');
});
test('stale lesson and noncanonical choice cannot submit a delayed recall attempt',()=>{
 let handler,saves=0,value='',lesson={id:'mine'};
 const form={dataset:{retentionLesson:'mine',retentionTopic:'topic',retentionQuestion:'b'}};
 const ctx={document:{addEventListener(type,fn){handler=fn}},lessonId:'mine',lessonById:()=>lesson,inlineSelected:()=>({topic:{id:'topic'},questions:q}),state:{mine:{}},inlineLatest:()=>answers,storeOptions:()=>({}),saveOptions:()=>{saves++},render:()=>{},FormData:class{get(){return value}},crypto:{randomUUID:()=> 'id'},Date,fmt:x=>x,Study:{localDate:x=>x}};
 runInNewContext(source,ctx);
 const event={target:{closest:()=>form},preventDefault(){}};
 lesson=null;handler(event);lesson={id:'mine'};form.dataset.retentionLesson='other';handler(event);
 form.dataset.retentionLesson='mine';for(const bad of ['', ' ', '0.0','0x1','-1','2','999999999999999999999']){value=bad;handler(event)}
 assert.equal(saves,0);
 value='1';handler(event);assert.equal(saves,1);
});
