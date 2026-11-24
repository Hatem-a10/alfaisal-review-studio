import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {cacheKind,validAccount} from '../public/phase3-cache-policy.mjs';
test('offline policy excludes private account APIs and includes vendor and lesson content',()=>{for(const path of ['/api/progress','/api/capabilities','/api/admin-auth','/api/decks','/api/shared-decks','/signin'])assert.equal(cacheKind(path),null);assert.equal(cacheKind('/vendor/sql-wasm.wasm'),'core');assert.equal(cacheKind('/api/lesson-data'),'core');assert.equal(cacheKind('/api/study-assets/a'),'private');assert.equal(validAccount('a'.repeat(64)),true);assert.equal(validAccount('admin'),false)});
test('offline worker keeps shell outside private eviction and does not ignore query strings',()=>{const s=fs.readFileSync('public/review-sw.js','utf8');assert.match(s,/limited&&keys.length>240/);assert.match(s,/kind==='private'/);assert.match(s,/ignoreSearch:kind!=='private'/);assert.match(s,/accountKey!==account/)});
test('registration requires published release or explicit localhost test and binds verified account',()=>{const s=fs.readFileSync('public/phase3-offline.mjs','utf8');assert.match(s,/offline-test/);assert.match(s,/offlineReleaseEligible\(release\)/);assert.match(s,/await verify\(\)!==key/);assert.match(s,/controllerchange/)});

test('account key probe matches progress identity and is never cacheable',async()=>{
 const ts=await import('typescript');const source=fs.readFileSync('app/api/account-key/route.ts','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const denied=await api.GET(new Request('https://site.example/api/account-key'));assert.equal(denied.status,401);assert.equal(denied.headers.get('Cache-Control'),'no-store');
 const id='account-example',response=await api.GET(new Request('https://site.example/api/account-key',{headers:{'oai-authenticated-user-id':id}}));const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('review-studio:'+id));const expected=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');assert.deepEqual(await response.json(),{accountKey:expected});assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(cacheKind('/api/account-key'),null);
});

import {offlineReleaseEligible,createAccountBinder} from '../public/phase3-offline.mjs';

test('offline release gate stays enabled across major version changes',()=>{
 for(const displayVersion of ['v1.50','v1.77','v1.99','v2.00','v2.01','v10.03'])assert.equal(offlineReleaseEligible({displayVersion}),true,displayVersion);
 for(const displayVersion of ['v0.99','v1.49','v2','v2.0','invalid'])assert.equal(offlineReleaseEligible({displayVersion}),false,displayVersion);
 assert.equal(offlineReleaseEligible({displayVersion:'v2.00',status:'local-draft'}),false);
 assert.equal(offlineReleaseEligible(null),false);
});

test('late verification cannot restore an account after logout',async()=>{
 const a='a'.repeat(64),messages=[],worker={postMessage:m=>messages.push(m)};
 let local=a,resolve;
 const bind=createAccountBinder({getWorker:()=>worker,readKey:()=>local,isOnline:()=>true,verify:()=>new Promise(r=>{resolve=r})});
 const pending=bind();
 local=null;await bind();resolve(a);await pending;
 assert.deepEqual(messages,[{type:'ACCOUNT',key:null}]);
});

test('an account change during verification is not bound without a new check',async()=>{
 const a='a'.repeat(64),b='b'.repeat(64),messages=[],worker={postMessage:m=>messages.push(m)};
 let local=a,resolve;
 const bind=createAccountBinder({getWorker:()=>worker,readKey:()=>local,isOnline:()=>true,verify:()=>new Promise(r=>{resolve=r})});
 const pending=bind();local=b;resolve(a);await pending;
 assert.deepEqual(messages,[{type:'ACCOUNT',key:null}]);
});

test('a mismatched online identity never binds; an offline valid unlocked account can bind',async()=>{
 const a='a'.repeat(64),b='b'.repeat(64),messages=[],worker={postMessage:m=>messages.push(m)};
 let online=true,local=a,checks=0;
 const bind=createAccountBinder({getWorker:()=>worker,readKey:()=>local,isOnline:()=>online,verify:async()=>{checks++;return b}});
 await bind();online=false;await bind();local=null;await bind();
 assert.deepEqual(messages,[{type:'ACCOUNT',key:null},{type:'ACCOUNT',key:a},{type:'ACCOUNT',key:null}]);
 assert.equal(checks,1);
});
