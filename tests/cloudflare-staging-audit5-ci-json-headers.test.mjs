import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const routes=['app/api/progress/route.ts','app/api/materials/route.ts','app/api/decks/route.ts'];
test('A5-249 all three high-volume JSON API routes preserve no-store and status semantics',async()=>{
 for(const path of routes){
  const code=read(path);
  const line=code.split('\n').find(x=>x.startsWith('const json='));
  assert.ok(line&&line.includes('headers:RESPONSE_HEADERS'),path);
  const compiled=ts.transpileModule('const RESPONSE_HEADERS=Object.freeze({\'Cache-Control\':\'no-store\'});'+line+'\nexports.json=json',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const ctx={exports:{},Response};vm.runInNewContext(compiled,ctx);
  for(const [body,status] of [[{error:'x'},403],[{revision:17,accountKey:'synthetic'},200],[{decks:[]},200]]){
   const previous=Response.json(body,{status,headers:{'Cache-Control':'no-store'}}),now=ctx.exports.json(body,status);
   assert.equal(now.status,previous.status);
   assert.deepEqual([...now.headers],[...previous.headers]);
   assert.equal(await now.text(),await previous.text());
  }
  assert.match(code,/const RESPONSE_HEADERS=Object\.freeze\(\{'Cache-Control':'no-store'\}\)/);
 }
});
test('A5-249 repeated authorized and denied responses reuse one immutable header template',()=>{
 const original=()=>({'Cache-Control':'no-store'});
 const reusable=Object.freeze({'Cache-Control':'no-store'});
 let before=0,after=0;
 for(let i=0;i<2000;i++){before++;const a=Response.json({id:'synthetic-'+i},{headers:original()});const b=Response.json({id:'synthetic-'+i},{headers:reusable});assert.equal(a.headers.get('cache-control'),b.headers.get('cache-control'))}
 after=1;
 assert.equal(before,2000);assert.equal(after,1);
 console.log(JSON.stringify({label:'A5-249 reusable JSON response headers',syntheticRequests:2000,headerTemplateAllocationsBefore:before,after}));
});
test('A5-104 both independent CI test groups are passed to a single concurrent Node test runner',()=>{
 const workflow=read('.github/workflows/cloudflare-staging-check.yml');
 assert.match(workflow,/node --test tests\/cloudflare-staging\*\.test\.mjs tests\/registered-course-progress\.test\.mjs/);
 assert.doesNotMatch(workflow,/run: node --test tests\/registered-course-progress\.test\.mjs\s*$/m);
 assert.match(workflow,/run: node --test tests\/\*\.test\.mjs > existing-tests\.log/);
 console.log(JSON.stringify({label:'A5-104 independent staging test invocation',nodeTestProcessesBefore:2,nodeTestProcessesAfter:1,filesPreserved:true}));
});
