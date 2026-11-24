import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {historyDates as candidate} from '../public/activity-metrics.mjs';
const baseline="function historyDates(end,days,baseline,questions,all=true){const valid=d=>/^\\d{4}-\\d{2}-\\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;if(!valid(end))return [];let first=null;if(all)for(const source of [days,baseline,questions])for(const d of Object.keys(source||{}))if(d<=end&&(first===null||d<first)&&valid(d))first=d;const last=Date.parse(end+'T12:00:00Z'),earliest=first!==null?Date.parse(first+'T12:00:00Z'):last-83*86400000,start=Math.max(earliest,last-(all?365:83)*86400000),count=Math.max(1,Math.round((last-start)/86400000)+1);return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10))}";
const original=vm.runInNewContext(baseline+'\nhistoryDates',{Date,Math,Array,Object,Number,RegExp});
const median=fn=>{fn();const times=[];for(let i=0;i<7;i++){const start=performance.now();fn();times.push(performance.now()-start)}return times.sort((a,b)=>a-b)[3]};
test('A5-010 cached activity chart dates preserve exact day, year and 12-week handling',()=>{
 for(const end of ['2026-11-24','2028-03-01','2025-01-01','2026-02-29','x','2024-02-29']){
  for(const all of [true,false,0,1])for(const first of ['2020-01-01','2026-11-22','2028-02-28',null]){
   const days=first?{[first]:{minutes:3}}:{},baseline={'2025-06-02':{}},questions={'2024-02-29':1};
   const expected=original(end,days,baseline,questions,all),got=candidate(end,days,baseline,questions,all);
   assert.deepEqual(got,expected,JSON.stringify({end,all,first}));
   assert.notEqual(got,candidate(end,days,baseline,questions,all));
  }
 }
});
test('A5-010 cached chart geometry is isolated from returned array edits and source-key changes',()=>{
 const days={'2026-11-21':{minutes:20}},baseline={'2026-11-22':{}},questions={};
 const first=candidate('2026-11-24',days,baseline,questions,true);
 first[0]='mutated';
 assert.deepEqual(candidate('2026-11-24',days,baseline,questions,true),original('2026-11-24',days,baseline,questions,true));
 days['2024-10-01']={minutes:2};
 assert.deepEqual(candidate('2026-11-24',days,baseline,questions,true),original('2026-11-24',days,baseline,questions,true));
 delete days['2024-10-01'];
 assert.deepEqual(candidate('2026-11-24',days,baseline,questions,true),original('2026-11-24',days,baseline,questions,true));
 assert.deepEqual(candidate('2026-11-24',days,baseline,questions,false),original('2026-11-24',days,baseline,questions,false));
});
test('A5-010 repeated chart date creation benchmark across both display ranges',()=>{
 const day='2026-11-24',days={'2025-01-01':{minutes:30}},baseline={},questions={};
 for(const all of [false,true]){
  const a=()=>{for(let i=0;i<100;i++)original(day,days,baseline,questions,all)};
  const b=()=>{for(let i=0;i<100;i++)candidate(day,days,baseline,questions,all)};
  assert.deepEqual(candidate(day,days,baseline,questions,all),original(day,days,baseline,questions,all));
  const baselineMedianMs=median(a),candidateMedianMs=median(b);
  console.log(JSON.stringify({label:'A5-010 cached activity chart geometry',baselineMedianMs,candidateMedianMs,all,days:all?366:84,repeatedCalls:100}));
 }
});
