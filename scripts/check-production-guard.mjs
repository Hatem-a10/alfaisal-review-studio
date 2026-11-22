import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';

const origin='https://review.example.test';
const issuer='https://clerk.example.test';
const bindings={
 REVIEW_STUDIO_DEPLOYMENT:'production',
 REVIEW_STUDIO_AUTH_PROVIDER:'clerk',
 REVIEW_STUDIO_ORIGIN:origin,
 CLERK_ISSUER:issuer,
 CLERK_PUBLISHABLE_KEY:'pk_live_'+Buffer.from('clerk.example.test$').toString('base64'),
 CLERK_SECRET_KEY:'sk_live_synthetic_fixture',
 REVIEW_STUDIO_ACCESS:'restricted',
 REVIEW_STUDIO_OWNER_REAUTH:'1',
 REVIEW_STUDIO_CLERK_OWNER_SUB:'user_ProductionFixture',
 REVIEW_STUDIO_PANEL_PASSWORD_HASH:'pbkdf2-sha256$100000$'+'0'.repeat(32)+'$'+'0'.repeat(64),
};
const modulesRoot=resolve('dist/server');
const scripts=['index.js',...readdirSync(modulesRoot,{recursive:true}).filter(path=>path!=='index.js'&&/\.m?js$/.test(path))];
const worker=new Miniflare({
 modules:scripts.map(path=>({type:'ESModule',path:resolve(modulesRoot,path)})),modulesRoot,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
 bindings,d1Databases:{DB:'candidate-check'},r2Buckets:{BUCKET:'candidate-check'},host:'127.0.0.1',port:0,
});
try{
 for(const path of ['/auth/sign-up','/auth/sign-up/','/auth/%73ign-up']){
  const response=await worker.dispatchFetch(origin+path);
  assert.equal(response.status,404,path);
  assert.equal((await response.json()).error,'Registration is closed.');
 }
 const configuration=await worker.dispatchFetch(origin+'/auth/config');
 assert.equal(configuration.status,200);
 assert.equal((await configuration.json()).registrationClosed,true);
 assert.equal((await worker.dispatchFetch('https://wrong.example.test/auth/config')).status,503);
 for(const path of ['/health','/api/control-center/access','/api/progress','/api/decks']){
  const response=await worker.dispatchFetch(origin+path,{headers:{'x-review-studio-owner':'1','oai-authenticated-user-id':'forged'}});
  assert.equal(response.status,401,path);
 }
 console.log('PASS: compiled production Worker closes registration, enforces origin, and rejects forged identity on protected routes.');
}finally{
 await worker.dispose();
}
