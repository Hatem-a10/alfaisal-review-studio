import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile=(path,deps)=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>{if(!(name in deps))throw Error('Missing dependency '+name);return deps[name]},m,m.exports);return m.exports};
const bounded=compile('lib/bounded-request.ts',{}),origin='https://synthetic.example',auth={'oai-authenticated-user-id':'synthetic-owner',origin};
const report=env=>compile('app/api/admin-assets/report/route.ts',{'cloudflare:workers':{env},'../../../../lib/bounded-request':bounded,'../../../../lib/shared-upload-owner':{sharedUploadAccess:async()=>null}});
const reportRequest=body=>new Request(origin+'/api/admin-assets/report',{method:'POST',headers:auth,body});
test('deployment reports reject null, arrays, non-string fingerprint and multibyte oversize payloads',async()=>{
 const writes=[],api=report({BUCKET:{put:async(...v)=>writes.push(v)}});
 const valid={fingerprint:'a'.repeat(64),expandedBytes:1,builtAt:'2026-11-24T00:00:00Z'};
 for(const body of ['null','[]',JSON.stringify({...valid,fingerprint:[valid.fingerprint]})])assert.equal((await api.POST(reportRequest(body))).status,400);
 assert.equal((await api.POST(reportRequest('é'.repeat(1600)))).status,413);assert.equal(writes.length,0);
 assert.equal((await api.POST(reportRequest(JSON.stringify(valid)))).status,200);assert.equal(writes.length,1);
});
test('deployment report errors do not leak provider details',async()=>{
 const api=report({BUCKET:{put:async()=>{throw Error('private provider detail')}}});
 const r=await api.POST(reportRequest(JSON.stringify({fingerprint:'a'.repeat(64),expandedBytes:1,builtAt:'2026-11-24T00:00:00Z'})));
 assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private provider detail/);
});
const asset={path:'materials/fixture.pdf',size:10,sha:'a'.repeat(64)},tag='"'+asset.sha+'"',data=new Uint8Array(10);
const sites=compile('lib/site-assets.ts',{'./site-assets-manifest':{SITE_ASSETS:[asset]},'../public/renal-materials.json':[],'./active-booklet-assets.json':[],'./renal-booklet-asset.json':asset,'../public/mol-study-assets.json':{booklet:asset,assessments:asset,sources:[]},'./renal-lesson-figures.json':[],'./microscope-assets.json':[],'./renal-assessment-assets.json':[]});
const req=(headers={},method='GET')=>new Request(origin+'/'+asset.path,{method,headers:{...auth,...headers}});
test('source files check actual object length and give controlled storage errors',async()=>{
 const wrong={head:async()=>({size:9}),get:async()=>({size:9,body:data})};
 assert.equal((await sites.serveAsset(req(),wrong,asset.path)).status,503);
 assert.equal((await sites.serveAsset(req({Range:'bytes=0-2'}),wrong,asset.path)).status,503);
 const failing={get:async()=>{throw Error('provider')}};
 assert.equal((await sites.serveAsset(req(),failing,asset.path)).status,503);
});
test('source ranges reject unsafe values and honor If-Range and HEAD',async()=>{
 let gets=0;const b={head:async()=>({size:10}),get:async(k,options)=>{gets++;return {size:10,body:options?.range?data.slice(options.range.offset,options.range.offset+options.range.length):data}}};
 for(const range of ['bytes=-9007199254740992','bytes=0-9007199254740992'])assert.equal((await sites.serveAsset(req({Range:range}),b,asset.path)).status,416);
 const full=await sites.serveAsset(req({Range:'bytes=0-2','If-Range':'"old"'}),b,asset.path);assert.equal(full.status,200);assert.equal((await full.arrayBuffer()).byteLength,10);
 const part=await sites.serveAsset(req({Range:'bytes=0-2','If-Range':tag}),b,asset.path);assert.equal(part.status,206);assert.equal((await part.arrayBuffer()).byteLength,3);
 const head=await sites.serveAsset(req({Range:'bytes=0-2'},'HEAD'),b,asset.path,true);assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal(gets,2);
});
test('publisher conditional responses verify object existence and HEAD avoids reading full bodies',async()=>{
 let heads=0,gets=0,exists=false;const env={BUCKET:{head:async()=>{heads++;return exists?{size:10}:null},get:async()=>{gets++;return {size:10,body:data}}}};
 const pack={...asset,private:true,type:'application/pdf'},api=compile('lib/publisher-packs.ts',{'cloudflare:workers':{env},'./publisher-packs-manifest':{PUBLISHER_PACKS:[pack]}});
 assert.equal((await api.servePack(req({'If-None-Match':tag}))).status,503);
 exists=true;assert.equal((await api.servePack(req({'If-None-Match':tag}))).status,304);assert.equal((await api.servePack(req({},'HEAD'))).status,200);assert.equal(gets,0);assert.equal(heads,3);
 assert.equal((await api.servePack(new Request(origin+'/'+asset.path))).status,401);
});
