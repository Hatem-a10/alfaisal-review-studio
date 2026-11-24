import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const content=readFileSync(new URL('../lib/site-assets.ts',import.meta.url),'utf8');
const file={path:'materials/fixture.pdf',size:50,sha:'a'.repeat(64)};
const compile=source=>{const m={exports:{}};const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',js)(name=>({'./site-assets-manifest':{SITE_ASSETS:[file]},'../public/renal-materials.json':[],'./active-booklet-assets.json':[],'./renal-booklet-asset.json':file,'../public/mol-study-assets.json':{booklet:file,assessments:file,sources:[]},'./renal-assessment-assets.json':[]})[name],m,m.exports);return m.exports;};
const before=compile(content.replace('headOnly||request.headers.get(\'if-none-match\')===tag','headOnly||status===206||request.headers.get(\'if-none-match\')===tag'));
const after=compile(content);
const url='https://example.test/api/site-assets/'+file.path,tag='"'+file.sha+'"';
const make=(range,ifRange,method='GET')=>new Request(url,{method,headers:{...(range?{'Range':range}:{}),...(ifRange?{'If-Range':ifRange}:{})}});
const bucket=()=>{const reads={head:0,get:0},obj={head:async()=>{reads.head++;return {size:file.size}},get:async(_key,opts)=>{reads.get++;const length=opts?.range?.length??file.size;return {size:file.size,body:new Uint8Array(length)}}};return {reads,obj}};
test('A5-236 range reads use one R2 GET instead of redundant HEAD + GET',async()=>{
 const a=bucket(),b=bucket(),request=make('bytes=2-8',tag);
 const old=await before.serveAsset(request,a.obj,file.path),now=await after.serveAsset(request,b.obj,file.path);
 assert.equal(old.status,206);assert.equal(now.status,206);
 assert.equal(await old.arrayBuffer().then(x=>x.byteLength),7);assert.equal(await now.arrayBuffer().then(x=>x.byteLength),7);
 assert.deepEqual([...old.headers],[...now.headers]);assert.deepEqual(a.reads,{head:1,get:1});assert.deepEqual(b.reads,{head:0,get:1});
 console.log(JSON.stringify({label:'A5-236 private PDF range transfer',before:a.reads,after:b.reads}));
});
test('A5-236 safe response equivalence across full HEAD If-Range, conditional and missing asset cases',async()=>{
 const requests=[make(),make('bytes=0-0'),make('bytes=-10'),make('bytes=0-12','"obsolete"'),make('bytes=2-9',tag),new Request(url,{method:'HEAD'}),new Request(url,{headers:{'If-None-Match':tag}}),make('bytes=500-600')];
 for(const request of requests){
  const a=bucket(),b=bucket();
  const old=await before.serveAsset(request,a.obj,file.path,request.method==='HEAD'),now=await after.serveAsset(request,b.obj,file.path,request.method==='HEAD');
  assert.equal(now.status,old.status,request.url);
  assert.deepEqual([...now.headers],[...old.headers]);
  assert.equal(await now.text(),await old.text());
 }
 const missing={head:async()=>null,get:async()=>null};
 assert.equal((await after.serveAsset(make('bytes=2-5'),missing,file.path)).status,404);
 const damaged={head:async()=>({size:49}),get:async()=>({size:49,body:new Uint8Array(4)})};
 assert.equal((await after.serveAsset(make('bytes=2-5'),damaged,file.path)).status,503);
 assert.equal((await after.serveAsset(make('bytes=2-5'),damaged,file.path,true)).status,503);
});
