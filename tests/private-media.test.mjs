import * as academicConfig from '../lib/academic-config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import ts from 'typescript';

const body='private model bytes',sha=createHash('sha256').update(body).digest('hex');
const manifest=[{path:'anatomy-models/ribcage.glb.gz',size:body.length,sha,type:'application/gzip'}];
const origin='https://studio.example';
const auth={'oai-authenticated-user-id':'owner'};

function setup(){
 const files=new Map(),env={REVIEW_STUDIO_OWNER_ACCOUNT_KEY:createHash('sha256').update('review-studio:owner').digest('hex'),BUCKET:{
  async put(key,bytes,metadata){files.set(key,{key,body:bytes,size:bytes.byteLength,arrayBuffer:async()=>bytes,...metadata});},
  async get(key){return files.get(key);},
  async head(key){const row=files.get(key);return row&&{size:row.size,customMetadata:row.customMetadata};},
  async list(){return {objects:[...files.values()],truncated:false};},
 }};
 const load=(file,dependencies)=>{
  const loadedModule={exports:{}};
  new Function('require','module','exports','crypto',ts.transpileModule(readFileSync(file,'utf8'),{
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText)(name=>dependencies[name],loadedModule,loadedModule.exports,webcrypto);
  return loadedModule.exports;
 };
 const media=load('lib/private-media.ts',{'./private-media-manifest.json':manifest});
 const ownerAccess=load('lib/owner-access.ts',{'cloudflare:workers':{env},'./academic-config.mjs':academicConfig});
 const owner=load('lib/shared-upload-owner.ts',{'cloudflare:workers':{env},'./academic-config.mjs':academicConfig,'./owner-access':ownerAccess});
 return {media,api:load('app/api/private-media/route.ts',{'cloudflare:workers':{env},'../../../lib/private-media':media,'../../../lib/shared-upload-owner':owner}),env,files};
}

const get=(path,headers=auth)=>new Request(origin+path,{headers});
function post(value,headers={...auth,origin}){
 const form=new FormData();
 form.append(manifest[0].path,new Blob([value]),'model.glb.gz');
 return new Request(origin+'/api/private-media',{method:'POST',headers,body:form});
}

test('migration rejects unauthenticated, cross-origin and checksum-mismatched writes',async()=>{
 const {api,files}=setup();
 assert.equal((await api.POST(post(body,{origin}))).status,401);
 assert.equal((await api.POST(post(body,{...auth,origin:'https://other.example'}))).status,403);
 assert.equal((await api.POST(post(body,{'oai-authenticated-user-id':'classmate',origin}))).status,403);
 assert.equal((await api.POST(post('x'.repeat(body.length)))).status,400);
 assert.equal(files.size,0);
});

test('verified bytes retain their original URL and MIME type in the private worker',async()=>{
 const {api,media,env,files}=setup();
 assert.equal(await media.readPrivateMedia(get('/'+manifest[0].path),env.BUCKET),null);
 for(let i=0;i<2;i++)assert.equal((await api.POST(post(body))).status,200);
 const status=await (await api.GET(get('/api/private-media'))).json();
 assert.equal(status.verified,1);assert.equal(status.total,1);assert.equal(files.size,1);
 const response=await media.readPrivateMedia(get('/'+manifest[0].path+'?v=3'),env.BUCKET);
 assert.equal(response.headers.get('Content-Type'),'application/gzip');
 assert.equal(await response.text(),body);
 assert.equal((await media.readPrivateMedia(get('/'+manifest[0].path,{}),env.BUCKET)).status,401);
 assert.equal(await media.readPrivateMedia(get('/unrelated'),env.BUCKET),null);
});
