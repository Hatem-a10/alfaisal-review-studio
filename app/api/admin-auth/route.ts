import {env} from 'cloudflare:workers';
import {sameOrigin} from '../../../lib/academic-config.mjs';
import {requestOwner} from '../../../lib/owner-access';
import {accountKey, hasAdminRole, verifyAdminPassword} from '../../../lib/admin-auth-core.mjs';
export const dynamic = 'force-dynamic';
const json = (value:unknown, status=200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
type AdminEnv = typeof env & {REVIEW_STUDIO_ADMIN_PASSWORD_HASH?:string; REVIEW_STUDIO_OWNER_ACCOUNT_KEY?:string};
export async function GET(request:Request) {
 const user = request.headers.get('oai-authenticated-user-id');
 if (!user) return json({error:'Sign in required.'}, 401);
 const e = env as AdminEnv;
 try { return json({admin:await requestOwner(request) || await hasAdminRole(e.BUCKET,user)}); }
 catch { return json({error:'Admin authorization unavailable.'},503); }
}
export async function POST(request:Request) {
 const user = request.headers.get('oai-authenticated-user-id');
 if (!user) return json({error:'Sign in required.'},401);
 if (!sameOrigin(request)) return json({error:'Invalid origin.'},403);
 const e = env as AdminEnv;
 if (!e.BUCKET || !e.DB || !e.REVIEW_STUDIO_ADMIN_PASSWORD_HASH) return json({error:'Admin authorization unavailable.'},503);
 if (Number(request.headers.get('content-length') || 0) > 1024) return json({error:'Invalid request.'},413);
 let body:unknown;
 try {
  const reader = request.body?.getReader(); if (!reader) return json({error:'Invalid request.'},400);
  const parts:Uint8Array[] = []; let size = 0;
  while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 1024) { await reader.cancel(); return json({error:'Invalid request.'},413); } parts.push(value); }
  const data = new Uint8Array(size); let offset=0; for (const part of parts) { data.set(part,offset); offset+=part.length; }
  body = JSON.parse(new TextDecoder().decode(data));
 } catch { return json({error:'Invalid request.'},400); }
 if (!body || typeof body !== 'object' || !('password' in body) || typeof body.password !== 'string' || body.password.length > 256) return json({error:'Invalid request.'},400);
 try {
  const key = await accountKey(user), window = Math.floor(Date.now() / 900000);
  await e.DB.prepare('CREATE TABLE IF NOT EXISTS review_admin_auth_rate_v150 (account_key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)').run();
  const rate = await e.DB.prepare('INSERT INTO review_admin_auth_rate_v150 (account_key, window, count) VALUES (?, ?, 1) ON CONFLICT(account_key) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END, window = excluded.window WHERE window != excluded.window OR count < 5 RETURNING count').bind(key,window).first();
  if (!rate) return json({error:'Too many attempts. Try again later.'},429);
  if (!await verifyAdminPassword(body.password,e.REVIEW_STUDIO_ADMIN_PASSWORD_HASH)) return json({error:'Invalid password.'},403);
  await e.BUCKET.put('admin-role/v1/' + key,'1');
  return json({admin:true});
 } catch { return json({error:'Admin authorization unavailable.'},503); }
}
