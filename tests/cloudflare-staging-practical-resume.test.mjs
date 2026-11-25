import test from 'node:test';import assert from 'node:assert/strict';import {practicalResumeEntries} from '../public/study-next-core.mjs';
const at='2026-11-25T10:00:00Z';
test('resume includes answered unfinished labs and unsaved OSPE circuits only',()=>{
 const key='REN-LAB-kidney-histology-1:map',old='REN-LAB-posterior-wall:muscles';
 const rows=practicalResumeEntries({drafts:{[key]:{topic:key,submitted:false,answers:{q:1},at},[old]:{topic:old,submitted:false,answers:{q:0},at:'2026-11-24T10:00:00Z'},'MOL-LAB-dna:principles':{topic:'MOL-LAB-dna:principles',submitted:true,answers:{q:1},at},'ospe-current:REN':{id:'c',slots:[{station:'s'}],seconds:90,startedAt:at,at},'ospe-current':{discarded:true,at}}},Date.parse(at)+100000);
 assert.equal(rows.length,2);assert.equal(rows.find(r=>r.kind==='lab').id,key);assert.equal(rows.find(r=>r.kind==='ospe').detail,'Mark and save your result');
});
test('empty and discarded drafts never produce a resume action',()=>assert.deepEqual(practicalResumeEntries({drafts:{'REN-LAB-x:t':{topic:'REN-LAB-x:t',submitted:false,answers:{},at},'ospe-current':{at,discarded:true}}}),[]));
