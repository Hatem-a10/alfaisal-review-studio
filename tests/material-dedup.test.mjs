import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';import {webcrypto,createHash} from 'node:crypto';
import {lectureCourses} from '../public/course-registry.mjs';
const byte=s=>new TextEncoder().encode(s),sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(){const objects=new Map(),rows=[];const bucket={async get(k){const b=objects.get(k);return b?{size:b.length,body:b.slice(),arrayBuffer:async()=>b.slice().buffer,json:async()=>JSON.parse(new TextDecoder().decode(b))}:null},async head(k){return objects.has(k)?{size:objects.get(k).length}:null},async put(k,v){objects.set(k,typeof v==='string'?byte(v):new Uint8Array(v).slice())},async delete(k){for(const x of [k].flat())objects.delete(x)}};const env={BUCKET:bucket,DB:{prepare(sql){return{bind(...p){return{all:async()=>({results:rows.filter(x=>x.user===p[0])}),first:async()=>sql.includes('SUM(bytes)')?{bytes:rows.filter(x=>x.user===p[0]).reduce((n,x)=>n+x.bytes,0)}:rows.find(x=>x.id===p[0]&&x.user===p[1]),run:async()=>{if(sql.startsWith('INSERT')){const[id,user,name,lectureId,mime,bytes,pageCount,createdAt,quotaUser,remaining]=p;if(rows.some(x=>x.id===id)||rows.filter(x=>x.user===quotaUser).reduce((n,x)=>n+x.bytes,0)>remaining)return {meta:{changes:0}};rows.push({id,user,name,lectureId,mime,bytes,pageCount,createdAt});return {meta:{changes:1}}}return {meta:{changes:0}}}}}}}}};const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};new Function('require','module','exports','crypto',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>n==='cloudflare:workers'?{env}:n.endsWith('/course-registry.mjs')?{lectureCourses}:n.endsWith('/site-assets-manifest')?{SITE_ASSETS:[{path:'materials/existing.pdf',sha:sha('%PDF-1.7\nexisting document'),size:byte('%PDF-1.7\nexisting document').length}]}:n.endsWith('/study-asset-registry')?{STUDY_ASSETS:[]}:load(path.join(path.dirname(file),n+'.ts')),m,m.exports,webcrypto);cache.set(file,m.exports);return m.exports}function add(id,user,content,extract='{}'){rows.push({id,user,name:id+'.pdf',lectureId:'CVP-A5',bytes:byte(content).length,mime:'application/pdf',pageCount:1,createdAt:'2026-11-05'});objects.set(`materials/${user}/${id}/original`,byte(content));objects.set(`materials/${user}/${id}/text`,byte(extract))}return{objects,rows,add,upload:load('app/api/materials/route.ts').POST,clean:load('app/api/materials/deduplicate/route.ts').POST,get:load('app/api/materials/[id]/route.ts').GET}}
const headers=(user='owner',origin='https://test.example')=>({...(user?{'oai-authenticated-user-id':user}:{}),origin});
function upload(s,name='renamed.pdf',user='owner',lectureId='CVP-A5'){const form=new FormData();form.set('file',new File([s],name,{type:'application/pdf'}));form.set('lectureId',lectureId);form.set('extraction',JSON.stringify({pages:[{page:1,text:'readable'}]}));return new Request('https://test.example/api/materials',{method:'POST',headers:headers(user),body:form})}
const clean=(user,origin)=>new Request('https://test.example/api/materials/deduplicate',{method:'POST',headers:headers(user,origin),body:'{}'});
const get=(f,id,user='owner',format='')=>f.get(new Request('https://test.example/api/materials/'+id+format,{headers:headers(user)}),{params:Promise.resolve({id})});
test('renamed identical uploads reuse existing sources and changed bytes remain separate',async()=>{const f=fixture();f.add('old','owner','%PDF-1.7\nsame bytes');const r=await(await f.upload(upload('%PDF-1.7\nsame bytes'))).json();assert.equal(r.duplicate,true);assert.equal(r.id,'old');assert.equal(f.rows.length,1);assert.equal((await f.upload(upload('%PDF-1.7\nnew bytes!'))).status,200);assert.equal(f.rows.length,2);f.objects.set('site-assets/data/'+sha('%PDF-1.7\nexisting document'),byte('%PDF-1.7\nexisting document'));const b=await(await f.upload(upload('%PDF-1.7\nexisting document'))).json();assert.equal(b.builtin,true);assert.equal(b.url,'/api/site-assets/materials/existing.pdf');assert.equal(f.rows.length,2)});
test('cleanup reclaims only identical original bytes, preserves IDs, separate extractions and authorization',async()=>{const f=fixture();f.add('a','owner','%PDF-1.7\nsame bytes','{"one":1}');f.add('b','owner','%PDF-1.7\nsame bytes','{"two":2}');f.add('c','other','%PDF-1.7\nsame bytes');assert.equal((await f.clean(clean(''))).status,401);assert.equal((await f.clean(clean('owner','https://evil.example'))).status,403);const r=await(await f.clean(clean('owner'))).json();assert.equal(r.duplicates,1);assert.equal(r.reclaimed,byte('%PDF-1.7\nsame bytes').length);assert.equal(f.rows.length,3);assert.equal(f.objects.has('materials/other/c/original'),true);assert.equal(await(await get(f,'a')).text(),'%PDF-1.7\nsame bytes');assert.equal(await(await get(f,'b')).text(),'%PDF-1.7\nsame bytes');assert.deepEqual(await(await get(f,'b','owner','?format=text')).json(),{two:2});assert.equal((await get(f,'b','other')).status,404);assert.equal((await(await f.clean(clean('owner'))).json()).duplicates,0);const again=await(await f.upload(upload('%PDF-1.7\nsame bytes'))).json();assert.equal(again.id,'a')});

test('personal materials accept registered active-course lectures and reject unknown ones',async()=>{const f=fixture();for(const id of ['REN-A1','REN-P4','MOL-28']){const r=await f.upload(upload('%PDF-1.7\n'+id,'notes.pdf','owner',id));assert.equal(r.status,200);assert.equal((await r.json()).lectureId,id)}const invalid=await f.upload(upload('%PDF-1.7\nunknown','notes.pdf','owner','REN-A99'));assert.equal(invalid.status,400);assert.equal(f.rows.length,3)});

test('malformed or oversized cleanup requests do not touch originals',async()=>{
 const f=fixture();f.add('a','owner','%PDF-1.7\nkeep');
 for(const body of ['bad','null','[]','{"offset":"0"}','{"offset":null}','{"offset":99}','{"other":0}',' '.repeat(5000)]){
  const response=await f.clean(new Request('https://test.example/api/materials/deduplicate',{method:'POST',headers:headers(),body}));
  assert.ok([400,409,413].includes(response.status),body.slice(0,40));assert.ok(f.objects.has('materials/owner/a/original'));
 }
});
test('corrupt aliases reject null, foreign content and incorrect legacy bytes',async()=>{
 const f=fixture();f.add('a','owner','%PDF-1.7\nAAAA');f.add('b','owner','%PDF-1.7\nBBBB');
 f.objects.delete('materials/owner/a/original');const alias='materials/owner/a/original-alias',digest=sha('%PDF-1.7\nAAAA'),bytes=byte('%PDF-1.7\nAAAA').length;
 for(const value of [null,{key:'materials/other/b/original',sha:digest,bytes},{key:'materials/owner/b/original',sha:digest,bytes},{key:'site-assets/data/'+digest,sha:digest,bytes}]){
  f.objects.set(alias,byte(JSON.stringify(value)));assert.equal((await get(f,'a')).status,404);
 }
 f.objects.set(alias,byte(JSON.stringify({key:'materials/owner/b/original',sha:sha('%PDF-1.7\nBBBB'),bytes})));
 assert.equal(await(await get(f,'a')).text(),'%PDF-1.7\nBBBB');
});
test('same-size mismatched known original is not returned as a built-in duplicate',async()=>{
 const f=fixture(),original='%PDF-1.7\nexisting document';
 f.objects.set('site-assets/data/'+sha(original),byte(original.replace('existing','EXISTING')));
 const result=await(await f.upload(upload(original))).json();assert.equal(result.builtin,undefined);assert.equal(f.rows.length,1);
});
test('cleanup stops on inconsistent size and preserves originals; a canonical self-key is never deleted',async()=>{
 const f=fixture();f.add('a','owner','%PDF-1.7\nkeep');f.rows[0].bytes++;
 const response=await f.clean(clean('owner'));assert.equal(response.status,503);assert.equal((await response.json()).processed,0);assert.ok(f.objects.has('materials/owner/a/original'));
 const g=fixture(),body='%PDF-1.7\ncanonical',id='content-'+sha(body);g.add(id,'owner',body);
 assert.equal((await g.clean(clean('owner'))).status,200);assert.ok(g.objects.has('materials/owner/'+id+'/original'));
});
test('material downloads reject Anki rows and safely handle legacy mime and filename',async()=>{
 const f=fixture();f.add('anki','owner','deck');f.rows[0].lectureId='ANKI';assert.equal((await get(f,'anki')).status,404);
 f.add('doc','owner','private');f.rows[1].mime='text/html';f.rows[1].name="bad\ud800'file";
 const response=await get(f,'doc');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.match(response.headers.get('content-disposition'),/%EF%BF%BD%27/);
 assert.match((await get(f,'missing')).headers.get('cache-control'),/no-store/);
});
