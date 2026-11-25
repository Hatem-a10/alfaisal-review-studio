import test from 'node:test';import assert from 'node:assert/strict';import {nextClass} from '../public/study-next-core.mjs';
const e=(id,start,end,kind='lab',date='2026-11-25')=>({id,title:id,date,start,end,kind});
test('next class filters breaks, ended events and duplicates; flags overlaps',()=>{
 const lab=e('lab',700,800),lecture=e('lecture',750,850,'anatomy'),later=e('later',800,900,'mol','2026-11-26');
 const x=nextClass([e('break',690,700,'break'),e('ended',600,650),lab,lab,lecture,later],{date:'2026-11-25',minute:680});
 assert.equal(x.next.id,'lab');assert.deepEqual(x.overlaps.map(v=>v.id),['lecture']);
 const y=nextClass([lab,lecture,later],{date:'2026-11-25',minute:760});assert.equal(y.current.length,2);assert.equal(y.next.id,'later');
});
test('nothing is invented beyond the provided timetable',()=>assert.deepEqual(nextClass([],{date:'2026-11-25',minute:0}),{current:[],next:null,overlaps:[]}));
