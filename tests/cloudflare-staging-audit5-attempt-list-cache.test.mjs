import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/activity-metrics.mjs',import.meta.url),'utf8');
const start=source.indexOf('const attemptLists=new WeakMap();'),end=source.indexOf('// Unique recorded question identities',start);
assert.ok(start>0&&end>start);
const old="function attemptsOf(practice){return array(practice?.mocks).flatMap(m=>m?Array.isArray(m.attempts)?m.attempts:[m.snapshot]:[]).filter(Boolean)}\n";
const baseline=source.slice(0,start)+old+source.slice(end);
const fixture=text=>{const ctx=vm.createContext({Date,Intl,Array,WeakMap,Map,Set,Object,JSON,Number,String});vm.runInContext(text.replaceAll('export function ','function ')+'\nthis.api={questionHistory,attemptsOf}',ctx);return ctx.api};
const a=fixture(baseline),b=fixture(source);
const attempt=(id,at='2026-11-24T10:00:00Z')=>({finishedAt:at,questions:[{id,canonicalId:'question-'+id,options:['A','B']}],answers:{0:1}});
test('A5-006 exact question-history output across recent and all-time windows',()=>{
 const mocks=[{attempts:[attempt('one'),attempt('two','2026-10-05T10:00:00Z')]},{snapshot:attempt('three')},null];
 const practice={mocks,booklet:{'question-one':{at:'2026-11-24',completed:true}}};
 const records={'REN-P1':{learning:{attempts:[{q:'one',at:'2026-11-24T10:00:00Z'}]}}};
 for(const since of [null,'2026-11-01','2026-10-01','2026-11-25']){
  assert.equal(JSON.stringify(b.questionHistory(records,practice,since)),JSON.stringify(a.questionHistory(records,practice,since)),String(since));
 }
});
test('A5-006 cache invalidation on inserted, replaced and reordered mock attempt references',()=>{
 const first=attempt('a'),second=attempt('b');const mocks=[{attempts:[first,second]}],practice={mocks};
 const initial=b.attemptsOf(practice);
 assert.equal(b.attemptsOf(practice),initial);
 mocks[0].attempts[1]=attempt('c');const replaced=b.attemptsOf(practice);
 assert.notEqual(replaced,initial);assert.deepEqual(Array.from(replaced),Array.from(a.attemptsOf(practice)));
 mocks[0].attempts.reverse();const reordered=b.attemptsOf(practice);
 assert.notEqual(reordered,replaced);assert.deepEqual(Array.from(reordered),Array.from(a.attemptsOf(practice)));
 mocks.push({snapshot:attempt('d')});assert.deepEqual(Array.from(b.attemptsOf(practice)),Array.from(a.attemptsOf(practice)));
 mocks.pop();mocks[0].attempts.push(null);assert.deepEqual(Array.from(b.attemptsOf(practice)),Array.from(a.attemptsOf(practice)));
});
test('A5-006 in-place edits on unchanged attempt objects remain visible on every history view',()=>{
 const item=attempt('a'),mocks=[{attempts:[item]}],practice={mocks};
 const before=b.questionHistory({},practice,'2026-11-01');
 item.answers[0]=-1;assert.equal(JSON.stringify(b.questionHistory({},practice,'2026-11-01')),JSON.stringify(a.questionHistory({},practice,'2026-11-01')));
 item.finishedAt='2026-09-01T10:00:00Z';assert.equal(JSON.stringify(b.questionHistory({},practice,'2026-11-01')),JSON.stringify(a.questionHistory({},practice,'2026-11-01')));
 assert.notEqual(JSON.stringify(b.questionHistory({},practice,'2026-11-01')),JSON.stringify(before));
});
test('A5-006 repeated day-range calculations avoid new flattened mock arrays',()=>{
 const practice={mocks:Array.from({length:500},(_,i)=>({snapshot:attempt('q'+i)}))};
 const oldRefs=[],newRefs=[];
 for(let i=0;i<50;i++){oldRefs.push(a.attemptsOf(practice));newRefs.push(b.attemptsOf(practice))}
 assert.equal(new Set(oldRefs).size,50);assert.equal(new Set(newRefs).size,1);
 console.log(JSON.stringify({label:'A5-006 repeated mock history list',mocks:500,rangeCalculations:50,flattenedArraysBefore:50,after:1}));
});
