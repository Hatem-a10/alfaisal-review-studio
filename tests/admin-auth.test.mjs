import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync, randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const origin = 'https://review.example';
const password = 'Synthetic fixture only!';
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 600_000, 32, 'sha256').toString('hex');
const sql = readFileSync('drizzle/0002_multi_student.sql', 'utf8');
const compiled = ts.transpileModule(readFileSync('lib/admin-auth.ts','utf8'), {
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;

function fixture(t) {
 const sqlite = new DatabaseSync(':memory:');
 t.after(() => sqlite.close());
 sqlite.exec(sql);
 const db = {
  prepare(query) {
   return {bind(...params) {
    const stmt = sqlite.prepare(query);
    return {run: () => ({meta:{changes:stmt.run(...params).changes}}), first: () => stmt.get(...params)};
   }};
  },
  batch(statements) {return statements.map(statement => statement.run());}
 };
 const env = {DB:db,REVIEW_OWNER_ID:'owner',REVIEW_ADMIN_PASSWORD_HASH:['pbkdf2-sha256','600000',salt.toString('hex'),hash].join('$')};
 const module = {exports:{}};
 new Function('require','module','exports',compiled)(() => ({env}),module,module.exports);
 return {api:module.exports,sqlite,env};
}

function request({user='owner',method='GET',from=origin,cookie='',body}={}) {
 return new Request(origin+'/api/admin-session', {
  method, headers:{...(user?{'oai-authenticated-user-id':user}:{}),origin:from,cookie,'Content-Type':'application/json'},
  ...(body!==undefined ? {body:JSON.stringify({password:body})} : {})
 });
}

test('owner identity, correct password and same-origin requests are required',async t => {
 const {api}=fixture(t);
 assert.equal((await api.requireAdmin(request({user:null}))).status,401);
 assert.equal((await api.requireAdmin(request({user:'student'}))).status,403);
 assert.equal((await api.unlockAdmin(request({user:'student',method:'POST',body:password}))).status,403);
 assert.equal((await api.unlockAdmin(request({from:'https://other.example',method:'POST',body:password}))).status,403);
 assert.equal((await api.requireAdmin(request())).status,403);
 const response=await api.unlockAdmin(request({method:'POST',body:password}));
 assert.equal(response.status,200);
 const setCookie=response.headers.get('Set-Cookie');
 assert.match(setCookie,/Secure; HttpOnly; SameSite=Strict/);
 const cookie=setCookie.split(';')[0];
 assert.equal(await api.requireAdmin(request({cookie})),null);
 assert.equal((await api.requireAdmin(request({user:'student',cookie}))).status,403);
 assert.equal((await api.requireAdmin(request({method:'POST',from:'https://other.example',cookie}))).status,403);
 assert.equal((await api.lockAdmin(request({method:'DELETE',cookie}))).status,200);
 assert.equal((await api.requireAdmin(request({cookie}))).status,403);
});

test('the rate limit survives requests and stale sessions are rejected',async t => {
 const {api,sqlite}=fixture(t);
 for(let i=0;i<5;i++)assert.equal((await api.unlockAdmin(request({method:'POST',body:'incorrect'}))).status,403);
 assert.equal((await api.unlockAdmin(request({method:'POST',body:password}))).status,429);
 sqlite.exec('UPDATE review_admin_limits SET started_at = 0');
 const response=await api.unlockAdmin(request({method:'POST',body:password}));
 assert.equal(response.status,200);
 const cookie=response.headers.get('Set-Cookie').split(';')[0];
 sqlite.exec('UPDATE review_admin_sessions SET idle_until = 0');
 assert.equal((await api.requireAdmin(request({cookie}))).status,403);
});
