import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {performance} from 'node:perf_hooks';
const paths=["app/api/progress/route.ts","app/api/study-assets/[id]/route.ts","lib/publisher-packs.ts","app/api/study-assets/route.ts"];
const sources=paths.map(path=>readFileSync(new URL('../'+path,import.meta.url),'utf8'));
// Frozen relevant source sections from staging blobs 867bb6875103f2d05fc617206d42ff1328074d42, 23cee29ebed498f2e57159cc19ab609efe0942ad, 49289320a052b4fa1dcb8fabe5e292313d80447e, 547c526a7cba254f5d5a2be66bb9d616f37f996b.
const baselines=["const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});\nexport async function GET(request:Request){\n const id=request.headers.get('oai-authenticated-user-id');if(!id)return json({error:'Sign in to sync your study progress.'},401);\n if(!env.DB)return json({error:'Cloud saving is unavailable.'},503);\n const accountKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id)))).map(v=>v.toString(16).padStart(2,'0')).join('');\n // Small authenticated revision check avoids loading unchanged multi-megabyte snapshots from D1/R2.\n const since=new URL(request.url).searchParams.get('since');\n if(since!==null&&/^\\d+$/.test(since)&&Number.isSafeInteger(Number(since))){\n  const head=await env.DB.prepare('SELECT revision, updated_at, snapshot FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;updated_at:string;snapshot:string}>();\n  if(head&&head.revision===Number(since)){try{const pointer=JSON.parse(head.snapshot);if(pointer?.r2Snapshot&&(!env.BUCKET||!validPointer(pointer.r2Snapshot,id)||!await env.BUCKET.head(pointer.r2Snapshot)))throw Error('Snapshot missing');return json({revision:head.revision,updatedAt:head.updated_at,unchanged:true,acceptsPatch:true,accountKey})}catch{return json({error:'Cloud snapshot is unavailable. Your device copy is retained.'},503)}}\n }\n const row=await env.DB.prepare('SELECT revision, snapshot, updated_at FROM study_snapshots WHERE user_id = ?').bind(id).first<{revision:number;snapshot:string;updated_at:string}>();\n let snapshot;try{snapshot=row?await readSnapshot(row.snapshot,id):null}catch{return json({error:'Cloud snapshot is unavailable or damaged. Your device copy is retained; retry or contact support.'},503)}\n return json(row?{revision:row.revision,snapshot,updatedAt:row.updated_at,acceptsPatch:true,accountKey}:{revision:0,snapshot:null,acceptsPatch:true,accountKey});\n}\nfunction validPointer(key:unknown,id:string):key is string{return typeof key==='string'&&key.startsWith('progress/'+id+'/')&&/^[0-9a-f-]{36}$/i.test(key.slice(('progress/'+id+'/').length))}\nasync function readSnapshot(raw:string,id:string){\n let snapshot=JSON.parse(raw);if(snapshot?.r2Snapshot){if(!env.BUCKET||!validPointer(snapshot.r2Snapshot,id))throw Error('Invalid snapshot reference');const obj=await env.BUCKET.get(snapshot.r2Snapshot);if(!obj)throw Error('Snapshot missing');snapshot=await new Response(obj.body).json()}\n if(!snapshot||snapshot.app!=='alfaisal-review-studio'||snapshot.version!==2||!snapshot.records||typeof snapshot.records!=='object'||Array.isArray(snapshot.records))throw Error('Invalid stored snapshot');\n return snapshot;\n}\n","import {readBounded,RequestTooLarge} from '../../../../lib/bounded-request';\nimport {env} from 'cloudflare:workers';\nimport {STUDY_ASSETS} from '../../../../lib/study-asset-registry';\nexport const dynamic='force-dynamic';\nexport async function GET(request:Request,{params}:{params:Promise<{id:string}>}){\n if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});\n if(!env.BUCKET)return new Response('Storage unavailable',{status:503});\n const id=(await params).id,asset=STUDY_ASSETS.find(a=>a.id===id);if(!asset)return new Response('Not found',{status:404});\n const key='study-assets-v1/'+asset.sha;\n const error=(message:string,status:number)=>new Response(message,{status,headers:{'Cache-Control':'no-store'}});\n try{\n  let obj=await env.BUCKET.get(key);\n  if(!obj&&asset.id==='heart-v1'){\n   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);\n   try{\n    const response=await fetch('https://raw.githubusercontent.com/organui/heart-3d/c72ce6654ff8e282942f97750d3104f55ef4fc3d/public/models/heart.glb',{signal:controller.signal});if(!response.ok)return error('Model download unavailable; try again.',503);\n    const bytes=await readBounded(response,asset.size),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==asset.size||sha!==asset.sha)return error('Model integrity check failed',502);\n    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:asset.type},customMetadata:{sha:asset.sha}});obj=await env.BUCKET.get(key);\n   }catch(e){return error(e instanceof RequestTooLarge?'Model integrity check failed':'Model download unavailable; try again.',e instanceof RequestTooLarge?502:503)}finally{clearTimeout(timer)}\n  }\n  if(!obj)return error('Asset not uploaded',404);\n  if(obj.size!==asset.size)return error('Asset integrity check failed',503);\n  return new Response(obj.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, max-age=31536000, immutable','ETag':'\"'+asset.sha+'\"','X-Content-Type-Options':'nosniff','Content-Length':String(asset.size)}})\n }catch{return error('Study asset storage unavailable; try again.',503)}\n}\n","import {env} from 'cloudflare:workers';\nimport {PUBLISHER_PACKS} from './publisher-packs-manifest';\nexport {PUBLISHER_PACKS};\nexport const packKey=(sha:string)=>'publisher-packs/v1/'+sha;\nexport async function servePack(request:Request){const path=new URL(request.url).pathname.slice(1),asset=PUBLISHER_PACKS.find(a=>a.path===path);if(!asset)return new Response('Not found',{status:404});if(asset.private&&!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in to open this material',{status:401});if(!env.BUCKET)return new Response('Course storage unavailable',{status:503});const headers={'Content-Type':asset.type,'Content-Length':String(asset.size),'Cache-Control':asset.private?'private, no-store':path.startsWith('_studio/client-')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','ETag':'\"'+asset.sha+'\"','X-Content-Type-Options':'nosniff'};try{const unchanged=request.headers.get('if-none-match')===headers.ETag,headOnly=request.method==='HEAD'||unchanged;const file=headOnly?await env.BUCKET.head(packKey(asset.sha)):await env.BUCKET.get(packKey(asset.sha));if(!file||file.size!==asset.size)return new Response('Course asset unavailable',{status:503,headers:{'Cache-Control':'no-store'}});if(unchanged){const cache=new Headers(headers);cache.delete('Content-Length');return new Response(null,{status:304,headers:cache})}return new Response(headOnly?null:(file as R2ObjectBody).body,{headers})}catch{return new Response('Course asset unavailable',{status:503,headers:{'Cache-Control':'no-store'}})}}\n","const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});\nconst hash=async(v:Uint8Array<ArrayBuffer>)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',v))].map(b=>b.toString(16).padStart(2,'0')).join('');\nexport async function GET(request:Request){if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in required'},401);const bucket=env.BUCKET;if(!bucket)return json({error:'Private storage unavailable'},503);let verified=0,sizeMatched=0;try{for(let i=0;i<STUDY_ASSETS.length;i+=30){const rows=await Promise.all(STUDY_ASSETS.slice(i,i+30).map(a=>bucket.head('study-assets-v1/'+a.sha)));sizeMatched+=rows.filter((obj,j)=>obj?.size===STUDY_ASSETS[i+j].size).length;verified+=rows.filter((obj,j)=>obj?.size===STUDY_ASSETS[i+j].size&&obj?.customMetadata?.sha===STUDY_ASSETS[i+j].sha).length}return json({verified,sizeMatched,total:STUDY_ASSETS.length,legacyUnverified:sizeMatched-verified})}catch{return json({error:'Could not inspect study asset storage'},503)}}\n"];
function load(i,env,assets=[],old=false){
 const code=ts.transpileModule(old?baselines[i]:sources[i],{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports','env','STUDY_ASSETS',code)(n=>n==='cloudflare:workers'?{env}:n.includes('study-asset-registry')?{STUDY_ASSETS:assets}:n.includes('publisher-packs-manifest')?{PUBLISHER_PACKS:assets}:n.includes('course-registry')?{lectureCourses:new Map()}:n.includes('progress-delta')?{ProgressDelta:{}}:{},m,m.exports,env,assets);
 return m.exports;
}
const origin='https://synthetic.example',auth={'oai-authenticated-user-id':'synthetic-student'};
const req=(path,headers=auth)=>new Request(origin+path,{headers});
async function response(r){return {status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()}}
const snapshot={app:'alfaisal-review-studio',version:2,records:{}};
test('A5-055 unchanged and changed revision checks preserve responses with one D1 read',async()=>{
 const pointer='progress/synthetic-student/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 for(const row of [null,{revision:3,updated_at:'2026-11-24',snapshot:JSON.stringify(snapshot)},{revision:3,updated_at:'2026-11-24',snapshot:JSON.stringify({r2Snapshot:pointer})},{revision:3,updated_at:'2026-11-24',snapshot:'invalid'}])for(const available of [false,true]){
  const make=old=>{let reads=0,heads=0,gets=0;const env={DB:{prepare(sql){assert.match(sql,/WHERE user_id = \?/);return {bind(id){assert.equal(id,'synthetic-student');return {first:async()=>{reads++;return row}}}}}},BUCKET:{head:async k=>{heads++;assert.equal(k,pointer);return available?{}:null},get:async k=>{gets++;assert.equal(k,pointer);return available?{body:JSON.stringify(snapshot)}:null}}};return {api:load(0,env,[],old),counts:()=>({reads,heads,gets})}};
  for(const suffix of ['', '?since=0','?since=3','?since=invalid','?since=9007199254740992']){
   const before=make(true),after=make(false),request=req('/api/progress'+suffix);
   assert.deepEqual(await response(await after.api.GET(request)),await response(await before.api.GET(request)));
   assert.equal(after.counts().reads,1);assert.equal(after.counts().heads,before.counts().heads);assert.equal(after.counts().gets,before.counts().gets);
   if(row&&row.revision===3&&suffix==='?since=0')assert.equal(before.counts().reads,2);
  }
  const unauth=make(false);assert.equal((await unauth.api.GET(req('/api/progress',{}))).status,401);assert.equal(unauth.counts().reads,0);
 }
 console.log(JSON.stringify({label:'A5-055 changed revision',baselineD1Reads:2,candidateD1Reads:1}));
});
test('A5-250 immutable manifest lookup preserves first-match asset authorization and responses',async()=>{
 let reads=0;const assets=Array.from({length:1500},(_,i)=>({get id(){reads++;return 'asset-'+i},get path(){reads++;return 'asset-'+i},sha:String(i).padStart(64,'0'),size:3,type:'image/png',private:true}));assets.push({id:'asset-1499',path:'asset-1499',sha:'wrong',size:3,type:'image/png',private:false});
 const env={BUCKET:{get:async key=>({size:3,body:key.endsWith('wrong')?'bad':'abc'}),head:async()=>({size:3})}};
 for(const i of [1,2]){
  const before=load(i,env,assets,true),after=load(i,env,assets);
  const get=(api,headers,id='asset-1499')=>i===1?api.GET(req('/'+id,headers),{params:Promise.resolve({id})}):api.servePack(req('/'+id,headers));
  for(const id of ['asset-0','asset-1499','missing'])for(const headers of [auth,{}]){
   const actual=await response(await get(after,headers,id)),expected=await response(await get(before,headers,id));
   if(i===1&&expected.status===200)expected.headers['accept-ranges']='bytes';
   assert.deepEqual(actual,expected);
  }
  reads=0;for(let k=0;k<20;k++)await get(before,auth);const oldReads=reads;reads=0;for(let k=0;k<20;k++)await get(after,auth);const newReads=reads;
  assert.ok(oldReads>=30000);assert.ok(newReads<=20);
  console.log(JSON.stringify({label:'A5-250 '+paths[i],baselineManifestKeyReads:oldReads,candidateManifestKeyReads:newReads}));
 }
});
test('A5-247 asset report aggregates exactly the same matched and verified counts',async()=>{
 const assets=Array.from({length:95},(_,i)=>({id:'a'+i,sha:String(i),size:3,type:'image/png'}));
 const make=old=>{let reads=0;const env={BUCKET:{head:async key=>{reads++;const i=Number(key.split('/').at(-1));return i%5===0?null:{size:i%7===0?2:3,customMetadata:{sha:i%3===0?String(i):'bad'}}}}};return {api:load(3,env,assets,old),reads:()=>reads}};
 const before=make(true),after=make(false);assert.deepEqual(await response(await after.api.GET(req('/api/study-assets'))),await response(await before.api.GET(req('/api/study-assets'))));assert.equal(before.reads(),95);assert.equal(after.reads(),95);
 assert.equal((await after.api.GET(req('/api/study-assets',{}))).status,401);assert.equal(after.reads(),95);
 console.log(JSON.stringify({label:'A5-247 asset report',baselineIntermediateArraysPerBatch:2,candidateIntermediateArraysPerBatch:0}));
});

test('study assets support bounded, suffix and open-ended ranges without weakening access checks',async()=>{
 const asset={id:'fixture',sha:'a'.repeat(64),size:10,type:'audio/mp4'},bytes='0123456789',reads=[];
 const env={BUCKET:{get:async(key,opts)=>{
  reads.push({key,opts});
  const range=opts?.range;
  return {size:asset.size,body:range?bytes.slice(range.offset,range.offset+range.length):bytes};
 }}};
 const api=load(1,env,[asset]),tag='"'+asset.sha+'"';
 const get=(headers={},id=asset.id)=>api.GET(req('/api/study-assets/'+id,{...auth,...headers}),{params:Promise.resolve({id})});
 for(const [range,body,contentRange] of [['bytes=2-4','234','bytes 2-4/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-','89','bytes 8-9/10'],['bytes=9-999','9','bytes 9-9/10']]){
  const result=await get({Range:range,'If-Range':tag});
  assert.equal(result.status,206);
  assert.equal(result.headers.get('content-range'),contentRange);
  assert.equal(result.headers.get('content-length'),String(body.length));
  assert.equal(result.headers.get('etag'),tag);
  assert.equal(result.headers.get('accept-ranges'),'bytes');
  assert.equal(await result.text(),body);
  assert.equal(reads.at(-1).opts.range.length,body.length);
 }
 const full=await get({Range:'bytes=2-4','If-Range':'"old"'});
 assert.equal(full.status,200);assert.equal(await full.text(),bytes);assert.equal(reads.at(-1).opts,undefined);
 const count=reads.length;
 for(const range of ['bytes=10-','bytes=4-2','bytes=-0','bytes=1-2,4-5','bytes=9007199254740992-','bytes=-']){
  const invalid=await get({Range:range});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),'bytes */10');
 }
 assert.equal((await api.GET(req('/api/study-assets/fixture',{Range:'bytes=1-2'}),{params:Promise.resolve({id:asset.id})})).status,401);
 assert.equal((await get({Range:'bytes=1-2'},'unknown')).status,404);
 assert.equal(reads.length,count);
 const damaged=load(1,{BUCKET:{get:async()=>({size:9,body:'12'})}},[asset]);
 assert.equal((await damaged.GET(req('/api/study-assets/fixture',{...auth,Range:'bytes=1-2'}),{params:Promise.resolve({id:asset.id})})).status,503);
});
