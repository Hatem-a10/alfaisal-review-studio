import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker/staging.ts',import.meta.url),'utf8');
const modules=['../lib/admin-academics.mjs','../lib/admin-content.mjs','../lib/admin-resources.mjs'];
const begin=worker.indexOf('async function controlHandlers('),end=worker.indexOf('\nconst stagingWorker =',begin);
assert.ok(begin>0&&end>begin);
test('A5-043 ordinary Worker route initialization does not import Admin feature modules',()=>{
 for(const path of modules){
  assert.doesNotMatch(worker,new RegExp('^import .+ from [\\x27\\x22]'+path.replaceAll('.','\\.')+'[\\x27\\x22]', 'm'));
  assert.ok(worker.includes("import('"+path+"')"),path);
 }
 const pathBlock=worker.slice(worker.indexOf("if(canonical.startsWith('api/control-center/'))"),worker.indexOf("if(canonical==='auth/admin/accounts')"));
 assert.match(pathBlock,/await controlHandlers\(student\)/);
 assert.match(pathBlock,/await controlRoute\(\{request,env:config,user:auth\.user,row,owner,path:'\/'\+canonical,handlers\}\)/);
 assert.match(pathBlock,/catch\{return adminResponse\(\{error:'Admin feature modules unavailable\.'\},503\)\}/);
});
test('A5-043 lazy loading returns identical ordered Student and Admin handlers and stays deferred',async()=>{
 const originals=Object.fromEntries(modules.map((p,i)=>[p,i===0?{academicAdmin:()=>1,academicStudent:()=>2}:i===1?{contentAdmin:()=>3,contentStudent:()=>4}:{resourceAdmin:()=>5,resourceStudent:()=>6}]));
 const moduleSource=worker.slice(begin,end).replace(/import\('([^']+)'\)/g,(_,p)=>"fakeImport('"+p+"')");
 const code=ts.transpileModule(moduleSource+'\nthis.get=controlHandlers;',{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 let loads=[];const ctx=vm.createContext({Promise,fakeImport:async p=>{loads.push(p);return originals[p]}});
 vm.runInContext(code,ctx);
 assert.deepEqual(loads,[],'module definitions must not be evaluated at Worker startup');
 const student=await ctx.get(true);
 assert.deepEqual(Array.from(student),[originals[modules[0]].academicStudent,originals[modules[1]].contentStudent,originals[modules[2]].resourceStudent]);
 assert.deepEqual(loads,modules);
 loads=[];const admin=await ctx.get(false);
 assert.deepEqual(Array.from(admin),[originals[modules[0]].academicAdmin,originals[modules[1]].contentAdmin,originals[modules[2]].resourceAdmin]);
 assert.deepEqual(loads,modules);
 console.log(JSON.stringify({label:'A5-043 optional Admin module import',startupAdminModuleImportsBefore:3,after:0,onAdminRouteModules:3,handlersPerRoute:3}));
});
