import test from 'node:test';
import assert from 'node:assert/strict';
import {questionHistory} from '../public/activity-metrics.mjs';
const day='2026-11-24',at=day+'T10:00:00Z';
test('malformed activity records and collections do not crash the timeline',()=>{
 const records={a:null,b:{learning:{attempts:{}},mcqs:[null,{id:12,total:2,createdAt:at}]},c:{mcqs:{}}};
 const practice={mocks:[null,{attempts:[null,{questions:[null,{id:12}]}]}],booklet:{x:null}};
 assert.deepEqual(questionHistory(records,practice),{[day]:2});
});
test('legacy aggregate counts are bounded, deduplicated and not expanded per answer',()=>{
 const mcqs=[{id:'same',total:10000,createdAt:at},{id:'same',total:9000,createdAt:at},{id:'second',total:3,createdAt:at},{id:'legacy',createdAt:at},...[-1,0,1.5,Infinity,10001,'4'].map((total,i)=>({id:'bad'+i,total,createdAt:at}))];
 assert.deepEqual(questionHistory({L:{mcqs}}),{[day]:10004});
});
test('mock history excludes invalid answers while preserving valid historical records',()=>{
 const questions=[{id:'a',options:['A','B']},{id:'b',options:['A','B']},{id:'c',options:['A','B']},{id:'d',options:['A','B']},{id:'legacy'}];
 const practice={mocks:[{attempts:[{finishedAt:at,questions,answers:[-1,2,1.5,1,0]}]}]};
 assert.deepEqual(questionHistory({},practice),{[day]:2});
});
test('canonical question aliases follow chains and handle cycles consistently',()=>{
 const questions=[{id:'a',canonicalId:'b'},{id:'b',canonicalId:'c'},{id:'x',canonicalId:'y'},{id:'y',canonicalId:'x'},{id:'0',canonicalId:'x'}];
 const records={L:{learning:{attempts:['a','b','c','0','x','y'].map(q=>({q,at}))}}};
 assert.deepEqual(questionHistory(records,{mocks:[{snapshot:{questions}}]}),{[day]:2});
});
test('invalid calendar dates and coerced timestamp types are not counted',()=>{
 const records={L:{learning:{attempts:[{q:'a',at:'2026-02-30'},{q:'b',at:true},{q:'c',at:[day]},{q:'d',at},{q:12,at}]}}};
 assert.deepEqual(questionHistory(records),{[day]:1});
});
