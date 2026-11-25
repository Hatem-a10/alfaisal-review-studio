import test from 'node:test';import assert from 'node:assert/strict';import {authDeadline,authenticateManaged} from '../lib/managed-auth.mjs';import {managedUnavailablePage} from '../lib/managed-auth-pages.mjs';
const origin='https://staging.example.test',env={REVIEW_STUDIO_DEPLOYMENT:'staging',REVIEW_STUDIO_STAGING_ORIGIN:origin,CLERK_ISSUER:'https://clerk.example.test',CLERK_PUBLISHABLE_KEY:'pk_test_example',CLERK_SECRET_KEY:'sk_test_secret'};
test('unavailable browser navigation is safe, retryable HTML rather than an empty error',async()=>{
 const r=managedUnavailablePage();assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'15');assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('content-security-policy'),/script-src 'none'/);const html=await r.text();assert.match(html,/Retry account verification/);assert.match(html,/not a confirmation that you were signed out/);
});
test('hung Clerk verification fails closed with a bounded deadline, never promoting forged headers',async()=>{
 const deps={timeoutMs:5,createClerkClient:()=>({authenticateRequest:()=>new Promise(()=>{})})};
 const result=await authenticateManaged(new Request(origin+'/api/progress',{headers:{'oai-authenticated-user-id':'forged','x-review-studio-owner':'1'}}),env,deps);
 assert.equal(result.response.status,503);assert.equal(result.response.headers.get('retry-after'),'15');assert.equal(result.user,undefined);assert.equal(result.request.headers.get('x-review-studio-owner'),null);
 const page=await authenticateManaged(new Request(origin+'/',{headers:{accept:'text/html'}}),env,deps);assert.match(await page.response.text(),/Retry account verification/);
 assert.equal(await authDeadline(()=>42,20),42);
});
