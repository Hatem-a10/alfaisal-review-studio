import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/progress/route.ts',import.meta.url),'utf8');
const begin=source.indexOf('async function writeSnapshot('),end=source.indexOf('\n\ntype LearningEntry',begin);
assert.ok(begin>0&&end>begin);
const body=source.slice(begin,end);
function harness(previous=null,valid=true){
 const records={first:0,run:0,validated:0};
 const db={prepare:()=>({bind:()=>({first:async()=>{records.first++;return previous?{snapshot:JSON.stringify(previous)}:null},run:async()=>{records.run++;return {meta:{changes:1}}}})})};
 const env={DB:db,BUCKET:{put:async()=>{throw Error('unexpected large snapshot')}}};
 const args=['env','json','validSnapshot','readSnapshot','TextEncoder','Date','crypto'];
 const compiled=ts.transpileModule(body+'\nreturn writeSnapshot;',{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 const run=new Function(...args,compiled)(env,(data,status=200)=>({data,status}),()=>{records.validated++;return valid},async()=>previous,TextEncoder,Date,crypto);
 return {run,records};
}
const basic=()=>({app:'alfaisal-review-studio',version:2,records:{'REN-P1':{done:{}}}});
const receipt=()=>({version:1,stores:{options:{at:'2026-11-24T12:00:00Z',value:{answerReceipts:[{id:'r1'}]}}}});
test('A5-241 already-validated PUT/PATCH snapshots skip duplicate full validation when unchanged',async()=>{
 const s=harness(),r=await s.run('student',0,basic(),undefined,true);
 assert.equal(r.status,200);assert.equal(r.data.revision,1);
 assert.equal(s.records.validated,0);assert.equal(s.records.run,1);
 const raw=harness();await raw.run('student',0,basic());assert.equal(raw.records.validated,1);
 assert.match(source,/return writeSnapshot\(id,data\.revision,data\.snapshot,undefined,true\)/);
 assert.match(source,/return writeSnapshot\(id,body\.revision,snapshot,prior,true\)/);
});
test('A5-241 receipt preservation still triggers post-merge validation before write',async()=>{
 const previous={...basic(),extras:receipt()};
 const a=harness(previous),data=basic();
 const r=await a.run('student',4,data,undefined,true);
 assert.equal(r.status,200);assert.deepEqual(data.extras,previous.extras);assert.equal(a.records.validated,1);assert.equal(a.records.run,1);
 const b=harness(null,false),invalid=basic();invalid.extras=receipt();
 const direct=await b.run('student',5,invalid,undefined,false);assert.equal(direct.status,400);assert.equal(b.records.run,0);
});
test('A5-241 partial receipt recovery still validates altered companion stores',async()=>{
 const previous={...basic(),extras:receipt()},data={...basic(),extras:{version:1,stores:{options:{at:'2026-11-24T12:00:00Z',value:{theme:'dark'}}}}};
 const a=harness(previous,false);
 const result=await a.run('student',2,data,previous,true);
 assert.equal(result.status,400);assert.equal(a.records.validated,1);assert.equal(a.records.run,0);
 assert.deepEqual(data.extras.stores.options.value.answerReceipts,previous.extras.stores.options.value.answerReceipts);
});
test('A5-241 unchanged already-validated receipt-bearing payload does not fetch or revalidate',async()=>{
 const data={...basic(),extras:receipt()},a=harness();
 const r=await a.run('student',2,data,undefined,true);
 assert.equal(r.status,200);assert.equal(a.records.first,0);assert.equal(a.records.validated,0);
 console.log(JSON.stringify({label:'A5-241 progress validation reuse',acceptedSnapshots:1,baselineFullValidationPasses:2,candidateFullValidationPasses:1}));
});
