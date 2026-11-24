import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as core from '../lib/admin-auth-core.mjs';
import * as config from '../lib/academic-config.mjs';
import * as personal from '../lib/personal-upload.ts';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),zipModule={exports:{}};new Function('module','exports','require','__dirname',fs.readFileSync('public/vendor/jszip.min.js','utf8'))(zipModule,zipModule.exports,require,'public/vendor');const JSZip=zipModule.exports;
async function packageBytes(value){const zip=new JSZip();zip.file('collection.anki2',new Uint8Array([value,2,3]));return zip.generateAsync({type:'uint8array',compression:'DEFLATE'})}
const records=new Map(), rates=new Map();
const bucket={head:async k=>records.get(k)||null,get:async k=>records.get(k)||null,put:async(k,data,options={})=>{const bytes=typeof data==='string'?new TextEncoder().encode(data):new Uint8Array(data);records.set(k,{key:k,size:bytes.length,customMetadata:options.customMetadata,body:new Blob([bytes]).stream()});},list:async({prefix})=>({objects:[...records.values()].filter(v=>v.key.startsWith(prefix)),truncated:false})};
const db={prepare(sql){assert.match(sql,/review_admin_auth_rate_v150/);return {run:async()=>({}),bind(key,window){return {first:async()=>{let entry=rates.get(key);if(!entry||entry.window!==window)entry={window,count:0};if(entry.count>=5)return null;entry.count++;rates.set(key,entry);return {count:entry.count}}}}}}};
const salt=new Uint8Array(16).fill(7), hashkey=await crypto.subtle.importKey('raw',new TextEncoder().encode('secret'),'PBKDF2',false,['deriveBits']);
const digest=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},hashkey,256));
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
globalThis.__routeTest={env:{BUCKET:bucket,DB:db,REVIEW_STUDIO_ADMIN_PASSWORD_HASH:`pbkdf2-sha256$310000$${hex(salt)}$${hex(digest)}`},core,config,personal,owner:async r=>r.headers.get('oai-authenticated-user-id')==='owner'};
async function load(path){let source=fs.readFileSync(path,'utf8');source=source.replace(/import \{env\} from 'cloudflare:workers';/, 'const {env}=globalThis.__routeTest;').replace(/import \{([^}]+)\} from '\.\.\/\.\.\/\.\.\/lib\/admin-auth-core.mjs';/, 'const {$1}=globalThis.__routeTest.core;').replace(/import \{([^}]+)\} from '\.\.\/\.\.\/\.\.\/lib\/academic-config.mjs';/, 'const {$1}=globalThis.__routeTest.config;').replace(/import \{requestOwner\} from '\.\.\/\.\.\/\.\.\/lib\/owner-access';/, 'const requestOwner=globalThis.__routeTest.owner;');source=source.replace("import {hasAnkiCollection} from '../../../lib/personal-upload';",'const {hasAnkiCollection}=globalThis.__routeTest.personal;');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const auth=await load('app/api/admin-auth/route.ts'),shared=await load('app/api/shared-decks/route.ts'),download=await load('app/api/shared-decks/[id]/route.ts'),caps=await load('app/api/capabilities/route.ts');
function req(path,user,options={}){const headers=new Headers(options.headers);if(user)headers.set('oai-authenticated-user-id',user);return new Request('https://site.example'+path,{...options,headers});}
function login(user,password,origin='https://site.example'){return req('/api/admin-auth',user,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password})})}
test('authentication, persistent role, CSRF, and atomic account limit',async()=>{
 assert.equal((await auth.POST(login(null,'secret'))).status,401);
 assert.equal((await auth.POST(login('a','secret','https://evil.example'))).status,403);
 assert.equal((await auth.POST(login('a','bad'))).status,403);
 assert.equal((await auth.POST(login('a','secret'))).status,200);
 assert.equal((await (await caps.GET(req('/api/capabilities','a'))).json()).admin,true);
 assert.equal((await (await caps.GET(req('/api/capabilities','b'))).json()).admin,false);
 const results=await Promise.all(Array.from({length:7},()=>auth.POST(login('c','bad'))));
 assert.equal(results.filter(r=>r.status===403).length,5);assert.equal(results.filter(r=>r.status===429).length,2);
});
test('shared packages require admin write and permit signed-in reading',async()=>{
 const upload=(user,data,origin='https://site.example')=>{const form=new FormData();form.set('file',new File([data],'same.apkg'));form.set('cards','2');return req('/api/shared-decks',user,{method:'POST',headers:{origin},body:form})};
 const zip=await packageBytes(1);
 assert.equal((await shared.POST(upload('b',zip))).status,403);
 assert.equal((await shared.POST(upload('a',zip,'https://evil.example'))).status,403);
 assert.equal((await shared.POST(upload('a',new Uint8Array([1,2,3,4])))).status,400);
 assert.equal((await shared.POST(upload('a',new Uint8Array([80,75,3,4,1])))).status,400);
 const one=await (await shared.POST(upload('a',zip))).json(),two=await (await shared.POST(upload('a',await packageBytes(2)))).json();assert.notEqual(one.id,two.id);
 assert.equal((await shared.GET(req('/api/shared-decks',null))).status,401);
 assert.equal((await (await shared.GET(req('/api/shared-decks','b'))).json()).decks.length,2);
 assert.equal((await download.GET(req('/api/shared-decks/'+one.id,null),{params:Promise.resolve({id:one.id})})).status,401);
 const response=await download.GET(req('/api/shared-decks/'+one.id,'b'),{params:Promise.resolve({id:one.id})});assert.deepEqual(new Uint8Array(await response.arrayBuffer()),zip);
});
