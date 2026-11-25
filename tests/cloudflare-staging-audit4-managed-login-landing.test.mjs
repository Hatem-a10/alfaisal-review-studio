import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {managedDashboardLanding} from '../lib/managed-login-landing.mjs';
const origin='https://alfaisal.review';
test('old encoded dashboard landing redirects to the root without losing the query',()=>{
 for(const method of ['GET','HEAD']){
  const response=managedDashboardLanding(new Request(origin+'/%23dashboard?__clerk_handshake=synthetic',{method}));
  assert.equal(response.status,303);assert.equal(response.headers.get('Location'),origin+'/?__clerk_handshake=synthetic');assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
});
test('normal routes, arbitrary encoded paths, writes and redirect-like parameters cannot change the destination',()=>{
 for(const path of ['/','/auth/sign-in','/api/progress','/%23other','/%2523dashboard','/%23dashboard/extra'])assert.equal(managedDashboardLanding(new Request(origin+path)),null);
 assert.equal(managedDashboardLanding(new Request(origin+'/%23dashboard',{method:'POST'})),null);
 const response=managedDashboardLanding(new Request(origin+'/%23dashboard?redirect_url=https://example.org'));
 assert.equal(new URL(response.headers.get('Location')).origin,origin);assert.equal(new URL(response.headers.get('Location')).pathname,'/');
});
test('actual Clerk mount options use a fragment-free absolute root after both sign-in and sign-up',async()=>{
 const source=readFileSync(new URL('../public/managed-auth-client.js',import.meta.url),'utf8');
 for(const mode of ['sign-in','sign-up']){
  let mounted;
  const mount={replaceChildren(){}},Clerk={load:async()=>{},mountSignIn:(el,opts)=>{mounted={mode:'sign-in',opts}},mountSignUp:(el,opts)=>{mounted={mode:'sign-up',opts}}};
  const ctx={URL,setTimeout,clearTimeout,window:{Clerk,location:{origin}},fetch:async()=>({ok:true,json:async()=>({frontendAPI:'https://clerk.example',publishableKey:'test'})}),document:{body:{dataset:{authPage:mode}},getElementById:()=>mount,createElement:()=>({dataset:{}}),head:{append:s=>s.onload()}}};
  await runInNewContext(source,ctx);
  assert.equal(mounted.mode,mode);assert.equal(mounted.opts.forceRedirectUrl,origin+'/');assert.equal(mounted.opts.routing,'hash');
 }
});
test('worker repairs the legacy path before Clerk can handle it as a server route',()=>{
 const source=readFileSync(new URL('../worker/staging.ts',import.meta.url),'utf8');
 assert.ok(source.indexOf('managedDashboardLanding(incoming)')>0);
 assert.ok(source.indexOf('managedDashboardLanding(incoming)')<source.indexOf('await authenticateManaged(incoming,config)'));
});
