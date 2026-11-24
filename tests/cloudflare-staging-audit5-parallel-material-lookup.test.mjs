import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/materials/route.ts',import.meta.url),'utf8');
const from=source.indexOf('const bytes=await file.arrayBuffer()'),to=source.indexOf('if(existing)return json(',from);
assert.ok(from>0&&to>from);
const optimized=source.slice(from,to);
const old="const bytes=await file.arrayBuffer(),sha=await digest(bytes),known=await knownOriginal(env.BUCKET,sha,bytes.byteLength);\n if(known&&form.get('attachKnown')!=='1')return json({duplicate:true,builtin:true,url:known.url,name:known.name});\n const existing=await duplicateMaterial(env.BUCKET,user,(await materialRows(env.DB,user)).filter(row=>row.lectureId===lectureId),sha,bytes.byteLength);\n";
function fixture(code){
 const events=[],pending={};
 const deferred=name=>new Promise((resolve,reject)=>{events.push(name);pending[name]={resolve,reject}});
 const ctx=vm.createContext({events,pending,env:{DB:{},BUCKET:{}},user:'synthetic-student',lectureId:'REN-P1',form:{get:()=>null},
  file:{arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer},
  digest:async()=>('a'.repeat(64)),
  knownOriginal:()=>deferred('R2'),materialRows:()=>deferred('D1'),
  duplicateMaterial:async(_bucket,_user,rows)=>rows.find(x=>x.lectureId==='REN-P1')||null,
  json:payload=>payload});
 const js=ts.transpileModule('async function lookup(){'+code+'return existing}\nthis.lookup=lookup',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 vm.runInContext(js,ctx);
 return {run:ctx.lookup,events,pending};
}
const rows=[{id:'account-specific',lectureId:'REN-P1'},{id:'other',lectureId:'MOL-P1'}];
test('A5-045 D1 row query starts alongside authorized R2 lookup before either resolves',async()=>{
 const before=fixture(old),after=fixture(optimized);
 const one=before.run(),two=after.run();for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(before.events,['R2']);assert.deepEqual(after.events,['D1','R2']);
 before.pending.R2.resolve(null);after.pending.R2.resolve(null);
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(before.events,['R2','D1']);
 before.pending.D1.resolve(rows);after.pending.D1.resolve(rows);
 assert.equal((await one)?.id,'account-specific');assert.equal((await two)?.id,'account-specific');
 console.log(JSON.stringify({label:'A5-045 account-scoped material lookup concurrency',beforeIndependentStart:'R2 then D1',afterIndependentStart:'D1 alongside R2'}));
});
test('A5-045 short-circuit duplicate response is unchanged even if D1 lookup fails',async()=>{
 const before=fixture(old),after=fixture(optimized);
 const one=before.run(),two=after.run();for(let i=0;i<8;i++)await Promise.resolve();
 const known={url:'/api/study-assets/known',name:'Existing'};
 after.pending.D1.reject(Error('Simulated D1 transient unavailable'));after.pending.R2.resolve(known);before.pending.R2.resolve(known);
 const a=await one,b=await two;assert.equal(JSON.stringify(b),JSON.stringify(a));
 assert.equal(JSON.stringify(b),JSON.stringify({duplicate:true,builtin:true,url:known.url,name:known.name}));
});
test('A5-045 D1 error propagates when deduplication actually needs the account rows',async()=>{
 const f=fixture(optimized),run=f.run();for(let i=0;i<8;i++)await Promise.resolve();
 f.pending.D1.reject(Error('D1 unavailable'));f.pending.R2.resolve(null);
 await assert.rejects(run,/D1 unavailable/);
 assert.match(source,/const rowsPromise=materialRows\(env.DB,user\)\.then/);
 assert.match(source,/if\(!candidates.ok\)throw candidates.error/);
});
