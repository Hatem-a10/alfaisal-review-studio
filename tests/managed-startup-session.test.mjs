import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script id="deviceBootstrap">([\s\S]*?)<\/script>/)[1];
const owner = 'a'.repeat(64);
const student = 'b'.repeat(64);
const deviceKey = 'alfaisal-review-studio-v1-account';
const logoutKey = 'review-studio-managed-signed-out';

async function boot({online = true, response, key = owner, active = owner, initialized = true, locked = false} = {}) {
 const data = new Map();
 if (key) data.set(deviceKey, key);
 if (locked) data.set(logoutKey, '1');
 const meta = new Map([['active', active], ['initialized:' + active, initialized]]);
 class Storage {
  get length() { return data.size; }
  getItem(k) { return data.get(k) ?? null; }
  setItem(k, v) { data.set(k, v); }
  removeItem(k) { data.delete(k); }
  key(i) { return [...data.keys()][i]; }
 }
 const result = {opened: false, loaded: false, redirect: null, error: '', fetched: false};
 const db = {
  transaction(store) {
   const t = {objectStore: () => ({
    get: k => request(meta.get(k)),
    put: (v, k) => request(meta.set(k, v)),
    getAllKeys: () => request([]),
    getAll: () => request([]),
   })};
   function request(value) {
    const req = {result: value};
    queueMicrotask(() => { req.onsuccess(); t.oncomplete(); });
    return req;
   }
   return t;
  },
 };
 const context = {
  window: {REVIEW_STUDIO_FRESH_ACCOUNTS: true, dispatchEvent() {}},
  document: {
   getElementById: id => id === 'appBootText' ? {set textContent(value) { result.error = value; }} : null,
   querySelectorAll() { result.loaded = true; return []; },
  },
  navigator: {onLine: online},
  localStorage: new Storage(),
  Storage,
  CustomEvent: class {},
  location: {replace(url) { result.redirect = url; }},
  async fetch() {
   result.fetched = true;
   if (response instanceof Error) throw response;
   return response;
  },
  indexedDB: {open() {
   result.opened = true;
   const request = {result: db};
   queueMicrotask(() => request.onsuccess());
   return request;
  }},
 };
 await runInNewContext(bootstrap, context);
 return {...result, key: context.localStorage.getItem(deviceKey)};
}

test('a signed-out response redirects before opening a previously signed-in account', async () => {
 for (const status of [401, 403]) {
  const result = await boot({response: new Response(null, {status})});
  assert.equal(result.redirect, '/auth/sign-in');
  assert.equal(result.opened, false);
  assert.equal(result.loaded, false);
 }
});

test('a network error, unavailable service or invalid response cannot restore the owner on online startup', async () => {
 for (const response of [Error('network error'), new Response(null, {status: 503}), Response.json({accountKey: 'invalid'})]) {
  const result = await boot({response});
  assert.equal(result.opened, false);
  assert.equal(result.loaded, false);
  assert.equal(result.key, owner);
  assert.match(result.error, /Could not verify your sign-in/);
 }
});

test('a verified online student is bound to their own account before scripts load', async () => {
 const result = await boot({response: Response.json({accountKey: student})});
 assert.equal(result.loaded, true);
 assert.equal(result.key, student);
});

test('offline boot needs a matching previously initialized account and a device that is not signed out', async () => {
 for (const options of [{key: null}, {active: student}, {initialized: false}]) {
  const result = await boot({online: false, ...options});
  assert.equal(result.loaded, false);
  assert.equal(result.fetched, false);
  assert.match(result.error, /Reconnect and sign in/);
 }
 const signedOut = await boot({online: false, locked: true});
 assert.equal(signedOut.loaded, false);
 assert.equal(signedOut.redirect, '/auth/sign-in');
 const result = await boot({online: false});
 assert.equal(result.loaded, true);
 assert.equal(result.fetched, false);
 assert.equal(result.key, owner);
});
