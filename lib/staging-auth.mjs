const COOKIE = '__Host-review-staging';
const MAX_AGE = 8 * 60 * 60;
const enc = new TextEncoder();
// The Workers production runtime caps PBKDF2 at 100,000 iterations.
async function verifyPassword(password, encoded) {
 const match = /^pbkdf2-sha256\$(100000)\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);
 if (!match || typeof password !== 'string' || !password.length || password.length > 256) return false;
 const salt = Uint8Array.from(match[2].match(/../g), x => parseInt(x, 16));
 const expected = Uint8Array.from(match[3].match(/../g), x => parseInt(x, 16));
 const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
 const actual = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations:100000}, key, 256));
 let difference = 0;
 for (let i=0; i<expected.length; i++) difference |= actual[i] ^ expected[i];
 return difference === 0;
}
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reply = (body, status = 200, headers = {}) => new Response(body, {status, headers: {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers}});
const redirect = (location, headers = {}) => reply(null, 303, {Location:location, ...headers});
function safeReturn(value) {
 try {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\x00-\x1f\x7f]/.test(value)) return '/';
  const url = new URL(value, 'https://staging.invalid');
  if (url.origin !== 'https://staging.invalid') return '/';
  return url.pathname + url.search + url.hash;
 } catch { return '/'; }
}
function config(env) {
 if (env.REVIEW_STUDIO_DEPLOYMENT !== 'staging' || typeof env.REVIEW_STUDIO_STAGING_SESSION_SECRET !== 'string' || env.REVIEW_STUDIO_STAGING_SESSION_SECRET.length < 32) return null;
 try {
  const accounts = JSON.parse(env.REVIEW_STUDIO_STAGING_ACCOUNTS);
  if (!Array.isArray(accounts) || accounts.length !== 2) return null;
  const ids = new Set(), emails = new Set();
  for (const a of accounts) {
   if (!a || typeof a.id !== 'string' || !/^staging-[a-z0-9][a-z0-9_-]{0,63}$/.test(a.id) || typeof a.email !== 'string' || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.test$/i.test(a.email) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 100 || /[^\x20-\x7e]/.test(a.name) || typeof a.passwordHash !== 'string' || !/^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(a.passwordHash)) return null;
   if (ids.has(a.id) || emails.has(a.email.toLowerCase())) return null;
   ids.add(a.id); emails.add(a.email.toLowerCase());
  }
  return accounts;
 } catch { return null; }
}
async function signature(data, secret) {
 const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function issue(account, secret) {
 const payload = b64(enc.encode(JSON.stringify({id:account.id, exp:Math.floor(Date.now()/1000)+MAX_AGE})));
 return payload + '.' + b64(await signature(payload, secret));
}
async function session(request, accounts, secret) {
 try {
  const rawCookie = request.headers.get('cookie') || '';
  if (rawCookie.length > 4096) return null;
  const matches = rawCookie.split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE+'='));
  if (matches.length !== 1) return null;
  const parts = matches[0].slice(COOKIE.length+1).split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  const actual = unb64(parts[1]), expected = await signature(parts[0], secret);
  if (actual.length !== expected.length) return null;
  let diff = 0; for (let i=0;i<expected.length;i++) diff |= actual[i]^expected[i];
  if (diff) return null;
  const data = JSON.parse(new TextDecoder().decode(unb64(parts[0]))), now = Math.floor(Date.now()/1000);
  if (!Number.isSafeInteger(data.exp) || data.exp <= now || data.exp > now + MAX_AGE || typeof data.id !== 'string') return null;
  return accounts.find(a => a.id === data.id) || null;
 } catch { return null; }
}
const cookie = (value, age) => `${COOKIE}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
function sameOrigin(request) { return request.headers.get('origin') === new URL(request.url).origin; }
async function body(request) {
 const length = request.headers.get('content-length');
 if (length && (!/^\d+$/.test(length) || Number(length)>4096)) return null;
 if (!request.body) return new URLSearchParams();
 const reader = request.body.getReader(); let size = 0, chunks = [];
 try { while (true) { const {value, done} = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); return null; } chunks.push(value); } } catch { return null; }
 const bytes = new Uint8Array(size); let pos=0; for (const chunk of chunks) { bytes.set(chunk,pos); pos += chunk.length; }
 return new URLSearchParams(new TextDecoder().decode(bytes));
}
async function permit(db, ip) {
 if (!db || !ip || ip.length > 128) return false;
 try {
  await db.prepare('CREATE TABLE IF NOT EXISTS staging_auth_rate (ip TEXT NOT NULL, window INTEGER NOT NULL, attempts INTEGER NOT NULL, PRIMARY KEY (ip, window))').run();
  const window = Math.floor(Date.now()/900000);
  await db.prepare('DELETE FROM staging_auth_rate WHERE window < ?').bind(window - 1).run();
  const row = await db.prepare('INSERT INTO staging_auth_rate (ip, window, attempts) VALUES (?, ?, 1) ON CONFLICT(ip, window) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(ip, window).first();
  return !!row && row.attempts <= 10;
 } catch { return false; }
}
export async function authenticateStaging(request, env) {
 const headers = new Headers(request.headers);
 for (const key of [...headers.keys()]) if (key.toLowerCase().startsWith('oai-authenticated-user-')) headers.delete(key);
 const clean = new Request(request, {headers});
 const accounts = config(env);
 if (!accounts) return {request:clean, response:reply('Staging authentication unavailable', 503)};
 const url = new URL(request.url), path = url.pathname;
 const target = safeReturn(url.searchParams.get('return_to'));
 if (path === '/signin-with-chatgpt') return {request:clean, response:redirect('/staging/signin?return_to='+encodeURIComponent(target))};
 if (path === '/signout-with-chatgpt') return {request:clean, response:redirect('/staging/signout?return_to='+encodeURIComponent(target))};
 if (path === '/staging/signin') {
  if (request.method === 'GET') return {request:clean, response:reply(`<!doctype html><title>Staging sign in</title><h1>Staging sign in</h1><form method="post"><input type="hidden" name="return_to" value="${html(target)}"><label>Email <input name="email" type="email" required autocomplete="username"></label><label>Password <input name="password" type="password" required autocomplete="current-password"></label><button>Sign in</button></form>`, 200, {'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"})};
  if (request.method !== 'POST') return {request:clean, response:reply('Method not allowed',405,{Allow:'GET, POST'})};
  if (!sameOrigin(request)) return {request:clean, response:reply('Forbidden',403)};
  const form = await body(clean);
  if (!form) return {request:clean, response:reply('Request too large',413)};
  if (!await permit(env.DB, request.headers.get('CF-Connecting-IP'))) return {request:clean, response:reply('Sign in unavailable or rate limited',429)};
  const email = form.get('email') || '', password = form.get('password') || '';
  if (!email || email.length > 254 || !password || password.length > 256) return {request:clean, response:reply('Invalid credentials',401)};
  const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  // Always perform password derivation for unknown accounts as well.
  let valid;
  try { valid = await verifyPassword(password, (account || accounts[0]).passwordHash); }
  catch { return {request:clean, response:reply('Staging authentication unavailable',503)}; }
  if (!account || !valid) return {request:clean, response:reply('Invalid credentials',401)};
  return {request:clean, response:redirect(safeReturn(form.get('return_to')), {'Set-Cookie':cookie(await issue(account, env.REVIEW_STUDIO_STAGING_SESSION_SECRET),MAX_AGE)})};
 }
 if (path === '/staging/signout') {
  if (request.method === 'GET') return {request:clean, response:reply(`<!doctype html><title>Sign out</title><form method="post"><input type="hidden" name="return_to" value="${html(target)}"><button>Sign out</button></form>`,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"})};
  if (request.method !== 'POST') return {request:clean, response:reply('Method not allowed',405,{Allow:'GET, POST'})};
  if (!sameOrigin(request)) return {request:clean, response:reply('Forbidden',403)};
  const form = await body(clean); if (!form) return {request:clean,response:reply('Request too large',413)};
  return {request:clean,response:redirect(safeReturn(form.get('return_to')),{'Set-Cookie':cookie('',0)})};
 }
 const account = await session(request, accounts, env.REVIEW_STUDIO_STAGING_SESSION_SECRET);
 if (path === '/staging/session') {
  if (request.method !== 'GET') return {request:clean,response:reply('Method not allowed',405,{Allow:'GET'})};
  return {request:clean,response:reply(JSON.stringify({authenticated:!!account, ...(account ? {user:{id:account.id,email:account.email,name:account.name}} : {})}),200,{'Content-Type':'application/json; charset=utf-8'})};
 }
 if (account) {
  headers.set('oai-authenticated-user-id',account.id); headers.set('oai-authenticated-user-email',account.email); headers.set('oai-authenticated-user-full-name',account.name);
  return {request:new Request(clean,{headers})};
 }
 return {request:clean};
}
