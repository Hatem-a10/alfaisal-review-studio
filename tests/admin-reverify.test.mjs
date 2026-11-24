import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('a stale owner sign-in is refreshed in place with an emailed code, then retried once',()=>{
 const s=read('public/admin-control-center.mjs');
 assert.match(s,/if\(!response\.ok&&data\.reauthenticate===true&&!retried&&await reverifyIdentity\(\)\)return request\(path,options,true\)/);
 assert.match(s,/session\.startVerification\(\{level:'first_factor'\}\)/);
 assert.match(s,/session\.prepareFirstFactorVerification\(\{strategy:'email_code',emailAddressId\}\)/);
 assert.match(s,/session\.attemptFirstFactorVerification\(\{strategy:'email_code',code:/);
 assert.match(s,/attempt\?\.status!=='complete'/);
 assert.match(s,/session\.getToken\(\{skipCache:true\}\)/);
});

test('the server still requires a recent first-factor verification for owner step-up',()=>{
 const s=read('lib/admin-control.mjs');
 assert.match(s,/if\(env\.REVIEW_STUDIO_OWNER_REAUTH==='1'\)return user\.recentReauth===true;/);
 assert.match(s,/reauthenticate:true\},428\)/);
 assert.match(read('lib/managed-auth.mjs'),/age>=0&&age<10/);
});

test('signed-out sync no longer opens the ChatGPT sign-in dialog',()=>{
 assert.doesNotMatch(read('public/student-profile.mjs'),/Sign in with ChatGPT|signin-with-chatgpt/);
 assert.match(read('public/profile-entry.js'),/function signedOut\(\)\{authenticated=false\}/);
 assert.doesNotMatch(read('public/index.html'),/id="syncSignIn" href="\/signin-with-chatgpt/);
});
