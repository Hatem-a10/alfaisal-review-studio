import test from 'node:test';
import assert from 'node:assert/strict';
import {completionBand,snapshotDay,dayCompletion,mergeDaily} from '../public/phase2-daily.mjs';
const date='2026-11-20',at=date+'T12:00:00Z',now=new Date('2026-11-24T12:00:00Z');
test('malformed counters do not display a false completion or rest band',()=>{
 for(const [n,total] of [[NaN,5],[1,Infinity],[-1,5],[.5,4],[0,-1],['1',2]])assert.equal(completionBand(n,total).band,'unknown');
});
test('snapshot deduplicates task IDs without discarding an earlier valid completion',()=>{
 const s=snapshotDay(date,[null,{id:'a',completedAt:at},{id:'a'},{id:'b',completedAt:true},{id:'__proto__'},{id:'c',optional:true}],null,at);
 assert.equal(s.required.length,2);assert.equal(s.required[0].completedAt,at);assert.equal(s.required[1].completedAt,null);
 assert.equal(dayCompletion(date,s).completed,1);
});
test('malformed or mismatched baselines are unknown rather than rest',()=>{
 for(const s of [{required:{}},{date:'2026-11-21',required:[]},null])assert.equal(dayCompletion(date,s).band,'unknown');
 assert.equal(dayCompletion('2026-02-30',{required:[]}).band,'unknown');
 assert.equal(dayCompletion(date,{required:[{id:'a',completedAt:true},{id:'b',completedAt:'2026-02-30'}]}).completed,0);
});
test('same-day versions use parsed chronology rather than timezone-dependent string order',()=>{
 const x=snapshotDay(date,[{id:'old'}],null,date+'T18:00:00+03:00');
 const y=snapshotDay(date,[{id:'new'}],null,date+'T16:00:00Z');
 const result=mergeDaily({[date]:x},{[date]:y},new Date(date+'T17:00:00Z'));
 assert.equal(result[date].required[0].id,'new');
});
test('historical merge retains the observed denominator and earliest valid completion',()=>{
 const x=snapshotDay(date,[{id:'a',completedAt:date+'T17:30:00+03:00'},{id:'b'}],null,at);
 const y=snapshotDay(date,[{id:'a',completedAt:date+'T15:00:00Z'},{id:'c'}],null,'2026-11-22T12:00:00Z');
 const result=mergeDaily({[date]:x},{[date]:y},now);
 assert.deepEqual(result[date].required.map(t=>[t.id,t.completedAt]),[['a',date+'T17:30:00+03:00'],['b',null]]);
 assert.equal(dayCompletion(date,result[date]).percent,50);
});
test('malformed incoming date keys and baselines cannot replace valid history',()=>{
 const old=snapshotDay(date,[{id:'a'}],null,at);
 const next=mergeDaily({[date]:old},{[date]:{required:null},'2026-02-30':{required:[]}},now);
 assert.deepEqual(next,{[date]:old});
});
