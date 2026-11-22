import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticateManaged} from '../lib/managed-auth.mjs';

const env = {REVIEW_STUDIO_DEPLOYMENT:'staging', REVIEW_STUDIO_STAGING_ORIGIN:'https://stage.example',CLERK_ISSUER:'https://clerk.example',CLERK_SECRET_KEY:'sk_test_example',CLERK_PUBLISHABLE_KEY:'pk_test_example',REVIEW_STUDIO_CLERK_OWNER_SUB:'user_owner'};
const claims = {iss:env.CLERK_ISSUER,sub:'user_owner'};
function fixtures(overrides={}) {
 const auth = {userId:'user_owner',sessionId:'sess_1',sessionClaims:claims,...overrides.auth};
 const session = {id:'sess_1',userId:'user_owner',status:'active',expireAt:Date.now()+60000,abandonAt:Date.now()+60000,...overrides.session};
 const user = {id:'user_owner',primaryEmailAddressId:'email_1',emailAddresses:[{id:'email_1',emailAddress:'owner@example.org',verification:{status:'verified'}}],firstName:'Owner',lastName:'Example',...overrides.user};
 let options;
 const state = {status:'signed-in',tokenType:'session_token',headers:new Headers(),toAuth:()=>auth,...overrides.state};
 return {deps:{cache:new Map(),createClerkClient:()=>({authenticateRequest:async (_req, opts)=>{options=opts;return state},sessions:{getSession:async()=>session},users:{getUser:async()=>user}})}, get options(){return options}};
}
const req = (path='/',init={}) => new Request('https://stage.example'+path,init);
test('verifies identity and strips forged headers, preserving body',async()=>{
 const f=fixtures(); const result=await authenticateManaged(req('/',{method:'POST',headers:{origin:env.REVIEW_STUDIO_STAGING_ORIGIN,'oai-authenticated-user-role':'admin','x-review-studio-owner':'spoof','content-type':'text/plain'},body:'hello'}),env,f.deps);
 assert.equal(result.response,undefined); assert.equal(await result.request.text(),'hello');
 assert.match(result.user.id,/^clerk:[0-9a-f]{64}:user_owner$/); assert.equal(result.request.headers.get('oai-authenticated-user-role'),null);
 assert.equal(result.request.headers.get('x-review-studio-owner'),'1'); assert.equal(result.request.headers.get('oai-authenticated-user-email'),'owner@example.org');
 assert.deepEqual(f.options,{authorizedParties:[env.REVIEW_STUDIO_STAGING_ORIGIN],acceptsToken:'session_token'});
});
test('rejects spoofed identity when signed out and fails closed on configuration and cross-site writes',async()=>{
 const f=fixtures({state:{status:'signed-out'}});
 const r=await authenticateManaged(req('/',{headers:{'x-review-studio-owner':'1','oai-authenticated-user-id':'admin'}}),env,f.deps);
 assert.equal(r.request.headers.get('x-review-studio-owner'),null); assert.equal(r.request.headers.get('oai-authenticated-user-id'),null);
 assert.equal((await authenticateManaged(req(),{...env,CLERK_SECRET_KEY:''},f.deps)).response.status,503);
 assert.equal((await authenticateManaged(req('/',{method:'POST',headers:{origin:'https://evil.example'}}),env,f.deps)).response.status,403);
});
test('rejects untrusted tokens, revoked sessions and unverified email',async()=>{
 for (const override of [
  {auth:{sessionClaims:{...claims,iss:'https://evil.example'}}}, {auth:{sessionClaims:{...claims,azp:'https://evil.example'}}}, {auth:{userId:'user_other'}},
  {state:{tokenType:'api_key'}}, {session:{status:'revoked'}}, {session:{expireAt:Date.now()-1}}, {session:{userId:'user_other'}},
  {user:{emailAddresses:[{id:'email_1',emailAddress:'owner@example.org',verification:{status:'unverified'}}]}}, {user:{banned:true}}
 ]) {
  const f=fixtures(override); const result=await authenticateManaged(req(),env,f.deps);
  assert.equal(result.request.headers.get('oai-authenticated-user-id'),null,JSON.stringify(override));
 }
});
test('only configured subject receives owner flag',async()=>{
 const f=fixtures(); const result=await authenticateManaged(req(),{...env,REVIEW_STUDIO_CLERK_OWNER_SUB:'another_user'},f.deps);
 assert.equal(result.request.headers.get('x-review-studio-owner'),null); assert.equal(result.request.headers.get('x-review-studio-managed'),'1');
});
test('handshake allows only issuer or staging origin and preserves SDK cookies',async()=>{
 for (const [location,status] of [['https://clerk.example/handshake',307],['/handshake',307],['https://evil.example/',503],['//evil.example/',503]]) {
  const headers=new Headers({location,'set-cookie':'__client=abc; Secure; HttpOnly'}); const f=fixtures({state:{status:'handshake',headers}});
  const result=await authenticateManaged(req(),env,f.deps); assert.equal(result.response.status,status);
  if(status===307) assert.match(result.response.headers.get('set-cookie'),/__client=/);
 }
});
test('SDK failures do not expose secrets or trust incoming headers',async()=>{
 const result=await authenticateManaged(req('/',{headers:{'x-review-studio-owner':'1'}}),env,{createClerkClient(){throw Error('secret')}});
 assert.equal(result.response.status,503); assert.doesNotMatch(await result.response.text(),/secret/); assert.equal(result.request.headers.get('x-review-studio-owner'),null);
});
test('verified sessions are cached briefly; failed lookups are never cached',async()=>{
 let calls=0; let status='revoked'; const cache=new Map();
 const f=fixtures(); const original=f.deps.createClerkClient;
 f.deps.cache=cache; f.deps.createClerkClient=()=>{const client=original(); const get=client.sessions.getSession; client.sessions.getSession=async id=>{calls++; return {...await get(id),status}}; return client;};
 assert.equal((await authenticateManaged(req(),env,f.deps)).user,undefined);
 status='active'; assert.ok((await authenticateManaged(req(),env,f.deps)).user);
 assert.ok((await authenticateManaged(req(),env,f.deps)).user); assert.equal(calls,2);
});

test('actual Clerk SDK verifies RS256 session tokens before trusting identity',async()=>{
 const {generateKeyPairSync,createSign}=await import('node:crypto');
 const {createClerkClient}=await import('@clerk/backend');
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const now=Math.floor(Date.now()/1000);
 const token=(changes={},signingKey=privateKey)=>{
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const data=encode({alg:'RS256',typ:'JWT',kid:'test-key',cat:'cl_B7d4PD111AAA'})+'.'+encode({iss:env.CLERK_ISSUER,sub:'user_owner',sid:'sess_1',azp:env.REVIEW_STUDIO_STAGING_ORIGIN,iat:now-5,nbf:now-5,exp:now+60,...changes});
  const signer=createSign('RSA-SHA256'); signer.update(data); signer.end();
  return data+'.'+signer.sign(signingKey).toString('base64url');
 };
 const valid=token();
 const [,otherKey]=[null,generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey];
 const cases=[['valid',valid,true],['forged signature',token({},otherKey),false],['expired',token({exp:now-120}),false],['wrong authorized party',token({azp:'https://evil.example'}),false],['wrong issuer',token({iss:'https://evil.example'}),false]];
 const testEnv={...env,CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('clerk.example$').toString('base64')};
 for(const [label,jwt,accepted] of cases){
  const mock=fixtures();
  const deps={cache:new Map(),createClerkClient:opts=>{
   const actual=createClerkClient({...opts,jwtKey:publicKey});
   const backend=mock.deps.createClerkClient();
   return {authenticateRequest:actual.authenticateRequest,sessions:backend.sessions,users:backend.users};
  }};
  const result=await authenticateManaged(req('/',{headers:{authorization:'Bearer '+jwt,'oai-authenticated-user-id':'spoof','x-review-studio-owner':'1'}}),testEnv,deps);
  assert.equal(Boolean(result.user),accepted,`${label}: ${result.response?.status || 'signed out'}`);
  assert.equal(result.request.headers.get('oai-authenticated-user-id')?.startsWith('clerk:') || false,accepted,label);
  assert.equal(result.request.headers.get('x-review-studio-owner')==='1',accepted,label);
 }
});

test('production rejects development credentials and accepts only the configured HTTPS origin', async () => {
 const origin = 'https://study.example.org';
 const issuer = 'https://clerk.example.org';
 const production = {
  ...env, REVIEW_STUDIO_DEPLOYMENT:'production', REVIEW_STUDIO_ORIGIN:origin, CLERK_ISSUER:issuer,
  CLERK_PUBLISHABLE_KEY:'pk_live_'+Buffer.from('clerk.example.org$').toString('base64'),
  CLERK_SECRET_KEY:'sk_live_synthetic',
 };
 const claims={iss:issuer,sub:'user_owner',azp:origin};
 const denied = await authenticateManaged(new Request(origin),production,fixtures({auth:{sessionClaims:{...claims,fva:[0,-1]}}}).deps);
 assert.equal(denied.response.status,403);
 assert.equal(denied.request.headers.get('x-review-studio-owner'),null);
 const f = fixtures({auth:{sessionClaims:{...claims,fva:[0,0]}}});
 const request = new Request(origin);
 for (const overrides of [
  {CLERK_SECRET_KEY:env.CLERK_SECRET_KEY}, {CLERK_PUBLISHABLE_KEY:env.CLERK_PUBLISHABLE_KEY},
  {CLERK_ISSUER:'https://other.example.org'}, {REVIEW_STUDIO_ORIGIN:'https://app.workers.dev'},
  {REVIEW_STUDIO_ORIGIN:'https://app.chatgpt.site'}, {REVIEW_STUDIO_ORIGIN:''},
 ]) {
  assert.equal((await authenticateManaged(request,{...production,...overrides},f.deps)).response.status,503);
 }
 assert.equal((await authenticateManaged(req(),production,f.deps)).response.status,503);
 const authorized = await authenticateManaged(request,production,f.deps);
 assert.ok(authorized.user);
 assert.deepEqual(f.options.authorizedParties,[origin]);
 assert.equal(authorized.user.recentMfa,true);
 const staging = await authenticateManaged(req(),env,fixtures().deps);
 assert.notEqual(authorized.user.id,staging.user.id);
});
