import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
const code=readFileSync(new URL('../public/source-demand.js',import.meta.url),'utf8');
const intersect=vm.runInThisContext(code.slice(code.indexOf(' function intersectPages('),code.indexOf(' const beforeSearch=searchPassages'))+'\nintersectPages');
function baseline(sets){const scores=new Map();sets.forEach(set=>{for(const i of set)scores.set(i,(scores.get(i)||0)+1)});return [...scores].filter(([,score])=>score===sets.length).map(([i])=>i)}
function median(fn){fn();const t=[];for(let i=0;i<7;i++){const start=performance.now();fn();t.push(performance.now()-start)}return t.sort((a,b)=>a-b)[3]}
test('A5-114 intersection preserves first-term insertion order and empty cases',()=>{
 for(const sets of [[],[new Set([3,1,2])],[new Set([3,1,2]),new Set([2,3])],[new Set([3,1,2]),new Set([])],[new Set([3,1,2]),new Set([2,3]),new Set([1,3])],[new Set([4,2,1]),new Set([1,2]),new Set([2,1,5])]])assert.deepEqual(intersect(sets),baseline(sets));
});
test('A5-114 selective posting-list workload compares exact outputs',()=>{
 const large=new Set(Array.from({length:40000},(_,i)=>i)),medium=new Set(Array.from({length:30000},(_,i)=>i+1000)),small=new Set([999,1000,2345,39999,45000]),sets=[large,medium,small];
 assert.deepEqual(intersect(sets),baseline(sets));assert.deepEqual(intersect(sets),[1000,2345]);
 console.log(JSON.stringify({label:'A5-114 selective source search',baselineMedianMs:median(()=>baseline(sets)),candidateMedianMs:median(()=>intersect(sets)),baselineUnionEntries:40001,candidateMatches:2}));
});
