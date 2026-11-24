import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../app/api/progress/route.ts',import.meta.url),'utf8');
const from=source.indexOf('export async function GET(request:Request)'),end=source.indexOf('export async function PUT(request:Request)',from);
assert.ok(from>=0&&end>from);
function progressGet(env) {
 const snippet="const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});\n"+source.slice(from,end);
 const javascript=ts.transpileModule(snippet,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 new Function('exports','module','env','crypto','TextEncoder','Response','Request','URL',javascript)(mod.exports,mod,env,webcrypto,TextEncoder,Response,Request,URL);
 return mod.exports.GET;
}
const percentile=(times,p)=>[...times].sort((a,b)=>a-b)[Math.max(0,Math.ceil(p*times.length)-1)];
function fixture(count=24) {
 const records=new Map(Array.from({length:count},(_,i)=>[
  'synthetic-student-'+String(i).padStart(3,'0'),
  {revision:1,snapshot:JSON.stringify({app:'alfaisal-review-studio',version:2,records:{}}),updated_at:'2026-11-24T12:00:00Z'}
 ]));
 const metrics={calls:0,active:0,peak:0,scopes:new Set()};
 const db={
  prepare(sql) {
   assert.match(sql,/WHERE user_id = \?/);
   return {bind(id) {
    assert.ok(records.has(id),'only assigned synthetic accounts may be read');
    return {async first() {
     metrics.calls++;metrics.active++;metrics.peak=Math.max(metrics.peak,metrics.active);metrics.scopes.add(id);
     await new Promise(resolve=>setImmediate(resolve));metrics.active--;
     return records.get(id);
    }};
   }};
  }
 };
 return {db,records,metrics};
}
test('A5-291 concurrent synthetic progress reads preserve identity scoping and revision response',async()=>{
 const f=fixture(24),get=progressGet({DB:f.db});
 const count=192,concurrency=8,next={i:0},results=new Array(count),durations=[];
 async function worker(){
  for(;;){
   const i=next.i++;if(i>=count)return;
   const id='synthetic-student-'+String(i%24).padStart(3,'0');
   const request=new Request('https://staging.invalid/api/progress?since=1',{headers:{'oai-authenticated-user-id':id}});
   const start=performance.now(),response=await get(request),value=await response.json();
   durations.push(performance.now()-start);
   results[i]={id,accountKey:value.accountKey,status:response.status,revision:value.revision,unchanged:value.unchanged};
  }
 }
 await Promise.all(Array.from({length:concurrency},()=>worker()));
 assert.equal(f.metrics.calls,count);
 assert.equal(f.metrics.scopes.size,24);
 assert.ok(f.metrics.peak>1&&f.metrics.peak<=concurrency,'synthetic D1 mock should overlap read operations');
 const accountKeys=new Map();
 for(const row of results){
  assert.equal(row.status,200);assert.equal(row.revision,1);assert.equal(row.unchanged,true);
  assert.match(row.accountKey,/^[a-f0-9]{64}$/);
  if(accountKeys.has(row.id))assert.equal(row.accountKey,accountKeys.get(row.id));
  else accountKeys.set(row.id,row.accountKey);
 }
 assert.equal(new Set(accountKeys.values()).size,24,'all 24 account hashes are distinct');
 console.log(JSON.stringify({label:'A5-291 account-isolated progress sync concurrency proxy',syntheticAccounts:24,requests:count,concurrency,peakInFlightReads:f.metrics.peak,p50Ms:percentile(durations,.5),p95Ms:percentile(durations,.95),productionMeasurements:false,realCloudflareD1:false}));
});
test('A5-291 unauthenticated requests never access D1 account records',async()=>{
 const f=fixture(4),get=progressGet({DB:f.db}),response=await get(new Request('https://staging.invalid/api/progress?since=1'));
 assert.equal(response.status,401);assert.equal(f.metrics.calls,0);
 const data=await response.json();assert.match(data.error,/Sign in/);
});
