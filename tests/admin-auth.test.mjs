import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountKey, hasAdminRole, verifyAdminPassword} from '../lib/admin-auth-core.mjs';

test('password verification accepts only a valid salted PBKDF2 hash', async () => {
 const salt = new Uint8Array(16).fill(4);
 const key = await crypto.subtle.importKey('raw',new TextEncoder().encode('example-password'),'PBKDF2',false,['deriveBits']);
 const digest = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},key,256));
 const hex = b => Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
 const encoded = `pbkdf2-sha256$310000$${hex(salt)}$${hex(digest)}`;
 assert.equal(await verifyAdminPassword('example-password',encoded),true);
 assert.equal(await verifyAdminPassword('wrong',encoded),false);
 assert.equal(await verifyAdminPassword('example-password','bad'),false);
});
test('role lookup is scoped to the authenticated account', async () => {
 const keys = new Set(['admin-role/v1/'+await accountKey('one')]);
 const bucket = {head: async key => keys.has(key) ? {} : null};
 assert.equal(await hasAdminRole(bucket,'one'),true);
 assert.equal(await hasAdminRole(bucket,'two'),false);
 assert.equal(await hasAdminRole(bucket,''),false);
});
