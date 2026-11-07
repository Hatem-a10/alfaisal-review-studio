import {env} from 'cloudflare:workers';

const cookieName = '__Host-review-admin';
const idleMs = 15 * 60_000;
const lifetimeMs = 60 * 60_000;
const windowMs = 15 * 60_000;
const iterations = 600_000;
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const digest = async (token: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))));
const json = (body: unknown, status: number, headers: Record<string,string> = {}) =>
 Response.json(body, {status, headers: {'Cache-Control': 'no-store', ...headers}});

export function ownerId(headers: Headers) {
 const id = headers.get('oai-authenticated-user-id');
 return id && id === env.REVIEW_OWNER_ID ? id : null;
}

export function requireOwner(request: Request) {
 return ownerId(request.headers) ? null : json({error:'Owner access required.'}, 403);
}

function sameOrigin(request: Request) {
 return request.headers.get('origin') === new URL(request.url).origin;
}

function sessionToken(request: Request) {
 return request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-review-admin=([0-9a-f]{64})(?:;|$)/)?.[1];
}

function sessionCookie(token: string, age: number) {
 return `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
}

export async function requireAdmin(request: Request) {
 const id = ownerId(request.headers);
 if (!id) return json({error:'Owner access required.'}, request.headers.has('oai-authenticated-user-id') ? 403 : 401);
 if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request))
  return json({error:'Invalid origin.'}, 403);
 const token = sessionToken(request);
 if (!token) return json({error:'Unlock Admin Settings first.'}, 403);
 if (!env.DB || !env.REVIEW_ADMIN_PASSWORD_HASH) return json({error:'Admin access is unavailable.'}, 503);
 const now = Date.now();
 const result = await env.DB.prepare(
  'UPDATE review_admin_sessions SET idle_until = ? WHERE owner_id = ? AND token_hash = ? AND idle_until > ? AND expires_at > ?'
 ).bind(now + idleMs, id, await digest(token), now, now).run();
 return result.meta.changes === 1 ? null : json({error:'Admin session expired. Unlock Admin Settings again.'}, 403);
}

async function verify(password: string, encoded: string) {
 const match = /^pbkdf2-sha256\$600000\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(encoded);
 if (!match) return false;
 const salt = Uint8Array.from(match[1].match(/../g)!, byte => parseInt(byte, 16));
 const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
 const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations}, key, 256);
 const actual = hex(new Uint8Array(bits)), expected = match[2];
 let difference = 0;
 for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
 return difference === 0;
}

export async function unlockAdmin(request: Request) {
 const id = ownerId(request.headers);
 if (!id || !sameOrigin(request)) return json({error:'Owner access required.'}, 403);
 const db = env.DB, hash = env.REVIEW_ADMIN_PASSWORD_HASH;
 if (!db || !hash) return json({error:'Admin access is not configured.'}, 503);
 if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length')) > 2048)
  return json({error:'Invalid password request.'}, 400);
 const raw = await request.text();
 if (raw.length > 2048) return json({error:'Invalid password request.'}, 400);
 let password: unknown;
 try { password = JSON.parse(raw)?.password; } catch { return json({error:'Invalid password request.'}, 400); }
 if (typeof password !== 'string' || !password || password.length > 256)
  return json({error:'Invalid password request.'}, 400);

 const now = Date.now();
 const attempt = await db.prepare(`INSERT INTO review_admin_limits (owner_id, started_at, attempts) VALUES (?, ?, 1)
  ON CONFLICT(owner_id) DO UPDATE SET
   attempts = CASE WHEN started_at <= ? THEN 1 ELSE attempts + 1 END,
   started_at = CASE WHEN started_at <= ? THEN excluded.started_at ELSE started_at END
  WHERE started_at <= ? OR attempts < 5
  RETURNING attempts`).bind(id, now, now - windowMs, now - windowMs, now - windowMs).first();
 if (!attempt) return json({error:'Too many attempts. Try again in 15 minutes.'}, 429, {'Retry-After':'900'});
 if (!await verify(password, hash)) return json({error:'Incorrect administrator password.'}, 403);

 const token = hex(crypto.getRandomValues(new Uint8Array(32)));
 await db.batch([
  db.prepare(`INSERT INTO review_admin_sessions (owner_id, token_hash, idle_until, expires_at) VALUES (?, ?, ?, ?)
   ON CONFLICT(owner_id) DO UPDATE SET token_hash=excluded.token_hash, idle_until=excluded.idle_until, expires_at=excluded.expires_at`)
   .bind(id, await digest(token), now + idleMs, now + lifetimeMs),
  db.prepare('DELETE FROM review_admin_limits WHERE owner_id = ?').bind(id)
 ]);
 return json({unlocked:true}, 200, {'Set-Cookie':sessionCookie(token, lifetimeMs / 1000)});
}

export async function lockAdmin(request: Request) {
 const id = ownerId(request.headers);
 if (!id || !sameOrigin(request)) return json({error:'Owner access required.'}, 403);
 const token = sessionToken(request);
 if (token && env.DB)
  await env.DB.prepare('DELETE FROM review_admin_sessions WHERE owner_id = ? AND token_hash = ?')
   .bind(id, await digest(token)).run();
 return json({unlocked:false}, 200, {'Set-Cookie':sessionCookie('', 0)});
}
