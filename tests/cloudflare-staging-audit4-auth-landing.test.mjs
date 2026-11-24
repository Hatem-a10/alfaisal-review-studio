import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {recoverDashboardLanding} from '../lib/auth-landing.mjs';
const script=readFileSync(new URL('../public/managed-auth-client.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../worker/staging.ts',import.meta.url),'utf8');
test('sign-in and sign-up return to a fragment-free dashboard landing',async()=>{
 for(const mode of ['sign-in','sign-up']){
  let options;
  const mount={replaceChildren(){}};
  const document={body:{dataset:{authPage:mode}},getElementById:()=>mount,createElement:()=>({dataset:{}}),head:{append(node){node.onload()}}};
  const Clerk={async load(){},mountSignIn(_,o){options=o},mountSignUp(_,o){options=o}};
  await runInNewContext(script,{window:{Clerk},document,fetch:async()=>({ok:true,json:async()=>({frontendAPI:'https://clerk.example.test'})})});
  assert.equal(options.forceRedirectUrl,'/');
  assert.equal(options.routing,'hash');
 }
});
test('legacy Safari dashboard path redirects to same-origin root fragment',()=>{
 for(const method of ['GET','HEAD']){
  const response=recoverDashboardLanding(new Request('https://alfaisal.review/%23dashboard?state=example',{method}));
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'https://alfaisal.review/?state=example#dashboard');
  assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
test('recovery is exact and does not redirect writes, APIs, or unrelated paths',()=>{
 for(const pathname of ['/','/#dashboard','/%23dashboard/extra','/%2523dashboard','/%23other','/api/%23dashboard','/auth/sign-in'])assert.equal(recoverDashboardLanding(new Request('https://alfaisal.review'+pathname)),null);
 assert.equal(recoverDashboardLanding(new Request('https://alfaisal.review/%23dashboard',{method:'POST'})),null);
});
test('worker recovers the malformed path without weakening the authenticated root gate',()=>{
 assert.ok(worker.indexOf('recoverDashboardLanding(incoming)')>worker.indexOf('Managed authentication configuration unavailable'));
 assert.ok(worker.indexOf('recoverDashboardLanding(incoming)')<worker.indexOf('const auth=managed?'));
 assert.match(worker,/\['','index\.html'\]\.includes\(path\)&&!request\.headers\.has\('oai-authenticated-user-id'\)/);
});
