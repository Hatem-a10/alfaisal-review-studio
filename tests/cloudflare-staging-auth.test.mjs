import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { authenticateStaging } from '../lib/staging-auth.mjs';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const hash = 'pbkdf2-sha256$100000$00000000000000000000000000000000$';
const hex = bytes => Buffer.from(bytes).toString('hex');
const key = await crypto.subtle.importKey('raw',new TextEncoder().encode('test-password'),'PBKDF2',false,['deriveBits']);
const digest = hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(16),iterations:100000},key,256));
const accounts = [{id:'staging-one',email:'one@example.test',name:'Test One',passwordHash:hash+digest},{id:'staging-two',email:'two@example.test',name:'Test Two',passwordHash:hash+digest}];
let count = 0;
const db = {prepare(sql) { return {bind() { return {first:async()=>({attempts:++count}),run:async()=>({success:true})}; },run:async()=>({success:true})}; }};
const env = {REVIEW_STUDIO_DEPLOYMENT:'staging', REVIEW_STUDIO_STAGING_SESSION_SECRET:'test-secret-012345678901234567890123456789', REVIEW_STUDIO_STAGING_ACCOUNTS:JSON.stringify(accounts), DB:db};
const req = (path, opts={}) => new Request('https://stage.example.test'+path,opts);
async function login(extra='') { return authenticateStaging(req('/staging/signin',{method:'POST',headers:{origin:'https://stage.example.test','CF-Connecting-IP':'192.0.2.1','content-type':'application/x-www-form-urlencoded'},body:'email=one%40example.test&password=test-password'+extra}),env); }
test('fails closed outside staging and strips forged identity',async()=>{ const result=await authenticateStaging(req('/',{headers:{'OAI-Authenticated-User-Id':'prod-user'}}),{...env,REVIEW_STUDIO_DEPLOYMENT:'production'}); assert.equal(result.response.status,503); assert.equal(result.request.headers.get('oai-authenticated-user-id'),null); });
test('rejects invalid account configuration',async()=>{ const result=await authenticateStaging(req('/'),{...env,REVIEW_STUDIO_STAGING_ACCOUNTS:JSON.stringify([{...accounts[0],id:'production'},accounts[1]])}); assert.equal(result.response.status,503); });
test('login issues a secure cookie and server identity',async()=>{ const result=await login('&return_to=%2Fquiz%23one'); assert.equal(result.response.status,303); assert.equal(result.response.headers.get('location'),'/quiz#one'); const cookie=result.response.headers.get('set-cookie'); assert.match(cookie,/Secure; HttpOnly; SameSite=Lax/); const next=await authenticateStaging(req('/api',{headers:{cookie,'OAI-Authenticated-User-Id':'forged','OAI-Authenticated-User-Other':'forged'}}),env); assert.equal(next.request.headers.get('oai-authenticated-user-id'),'staging-one'); assert.equal(next.request.headers.get('oai-authenticated-user-email'),'one@example.test'); assert.equal(next.request.headers.get('oai-authenticated-user-other'),null); });
test('tampered or removed account session is rejected',async()=>{ const {response}=await login(); const c=response.headers.get('set-cookie').split(';')[0]; const bad=await authenticateStaging(req('/staging/session',{headers:{cookie:c+'x'}}),env); assert.equal((await bad.response.json()).authenticated,false); const replaced={...env,REVIEW_STUDIO_STAGING_ACCOUNTS:JSON.stringify([{...accounts[0],id:'staging-new'},accounts[1]])}; const removed=await authenticateStaging(req('/staging/session',{headers:{cookie:c}}),replaced); assert.equal((await removed.response.json()).authenticated,false); });
test('login requires same origin, bounded body, and D1',async()=>{ assert.equal((await authenticateStaging(req('/staging/signin',{method:'POST',body:'x'}),env)).response.status,403); assert.equal((await authenticateStaging(req('/staging/signin',{method:'POST',headers:{origin:'https://stage.example.test'},body:'x'.repeat(4097)}),env)).response.status,413); assert.equal((await authenticateStaging(req('/staging/signin',{method:'POST',headers:{origin:'https://stage.example.test','CF-Connecting-IP':'192.0.2.1'},body:'x'}),{...env,DB:null})).response.status,429); });
test('logout uses origin check and clears cookie; redirects remain local',async()=>{ const bad=await authenticateStaging(req('/staging/signout',{method:'POST',headers:{origin:'https://evil.test'},body:''}),env); assert.equal(bad.response.status,403); const good=await authenticateStaging(req('/staging/signout',{method:'POST',headers:{origin:'https://stage.example.test'},body:'return_to=%2F%2Fevil.test'}),env); assert.equal(good.response.headers.get('location'),'/'); assert.match(good.response.headers.get('set-cookie'),/Max-Age=0/); const compat=await authenticateStaging(req('/signin-with-chatgpt?return_to=%2F%2Fevil.test'),env); assert.equal(compat.response.headers.get('location'),'/staging/signin?return_to=%2F'); });
test('rate limiter rejects attempts after its limit',async()=>{ count=10; const result=await login(); assert.equal(result.response.status,429); });

test('rejects oversized credentials and cookies',async()=>{ count=0; const oversized=await authenticateStaging(req('/staging/signin',{method:'POST',headers:{origin:'https://stage.example.test','CF-Connecting-IP':'192.0.2.1'},body:'email='+('a'.repeat(255))+'&password=x'}),env); assert.equal(oversized.response.status,401); const result=await authenticateStaging(req('/staging/session',{headers:{cookie:'x'.repeat(4097)}}),env); assert.equal((await result.response.json()).authenticated,false); });

test('preserves bodies for authenticated and anonymous POST and PUT requests',async()=>{
 count=0; const {response}=await login(); const cookie=response.headers.get('set-cookie').split(';')[0];
 for (const method of ['POST','PUT']) {
  for (const authenticated of [true,false]) {
   const payload=JSON.stringify({method,authenticated});
   const result=await authenticateStaging(req('/api/test',{method,headers:{'content-type':'application/json',...(authenticated?{cookie}:{})},body:payload}),env);
   assert.equal(result.response,undefined);
   assert.equal(await result.request.text(),payload);
   assert.equal(result.request.headers.get('oai-authenticated-user-id'),authenticated?'staging-one':null);
  }
 }
});
