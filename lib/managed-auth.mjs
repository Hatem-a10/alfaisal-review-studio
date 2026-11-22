import { createClerkClient } from '@clerk/backend';

// Successful Backend API lookups are cached for at most 15 seconds per Worker isolate.
// Revocation, account lock, and email changes may take that long to take effect.
const verifiedCache = new Map();
const reply = (message, status) => new Response(message, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const cleanHeaders = request => {
 const headers = new Headers(request.headers);
 for (const key of [...headers.keys()]) if (/^(oai-authenticated-user-|x-review-studio-)/i.test(key)) headers.delete(key);
 return headers;
};
export function managedAuthConfig(env) {
 try {
  const production = env.REVIEW_STUDIO_DEPLOYMENT === 'production';
  if (!production && env.REVIEW_STUDIO_DEPLOYMENT !== 'staging') return null;
  const originValue = production ? env.REVIEW_STUDIO_ORIGIN : env.REVIEW_STUDIO_STAGING_ORIGIN;
  const publicKey = env.CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;
  if (!originValue || !env.CLERK_ISSUER || !publicKey || !secretKey) return null;
  const origin = new URL(originValue), issuer = new URL(env.CLERK_ISSUER);
  if (origin.protocol !== 'https:' || origin.origin !== originValue ||
      issuer.protocol !== 'https:' || issuer.origin !== env.CLERK_ISSUER) return null;
  if (production) {
   if (!publicKey.startsWith('pk_live_') || !secretKey.startsWith('sk_live_')) return null;
   if (atob(publicKey.slice('pk_live_'.length)) !== issuer.hostname + '$') return null;
   if (issuer.hostname.endsWith('.clerk.accounts.dev') ||
       origin.hostname.endsWith('.workers.dev') || origin.hostname.endsWith('.chatgpt.site')) return null;
  }
  return {origin:origin.origin, issuer:issuer.origin};
 } catch { return null; }
}
function sdkHeaders(input) {
 const output = new Headers();
 if (!input) return output;
 // Clerk needs its response cookies for session refresh; no arbitrary SDK headers
 // are reflected into the application response.
 if (typeof input.getSetCookie === 'function') for (const cookie of input.getSetCookie()) output.append('Set-Cookie',cookie);
 else if (input.get('set-cookie')) output.append('Set-Cookie',input.get('set-cookie'));
 return output;
}
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const safeText = (value, max) => typeof value === 'string' && value.length <= max && !/[\x00-\x1f\x7f-\x9f]/.test(value);
async function namespace(issuer, subject) {
 const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(issuer));
 return 'clerk:' + [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('') + ':' + subject;
}
/** Authenticate an independent Worker request using Clerk's verified session and Backend API. */
export async function authenticateManaged(request, env, deps = {}) {
 const headers = cleanHeaders(request);
 const clean = new Request(request,{headers});
 const cfg = managedAuthConfig(env);
 if (!cfg || new URL(request.url).origin !== cfg.origin) return {request:clean,response:reply('Managed authentication unavailable',503)};
 if (!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.get('origin') !== cfg.origin) return {request:clean,response:reply('Forbidden',403)};
 try {
  const client = (deps.createClerkClient || createClerkClient)({secretKey:env.CLERK_SECRET_KEY,publishableKey:env.CLERK_PUBLISHABLE_KEY});
  const state = await client.authenticateRequest(clean,{authorizedParties:[cfg.origin],acceptsToken:'session_token'});
  const responseHeaders = sdkHeaders(state.headers);
  if (state.status === 'handshake') {
   const location = state.headers?.get('location');
   let target;
   try { target = new URL(location, cfg.origin); } catch { return {request:clean,response:reply('Authentication unavailable',503)}; }
   if (!location || target.username || target.password || ![cfg.origin,cfg.issuer].includes(target.origin)) return {request:clean,response:reply('Authentication unavailable',503)};
   responseHeaders.set('Location',target.href); responseHeaders.set('Cache-Control','no-store');
   return {request:clean,response:new Response(null,{status:307,headers:responseHeaders})};
  }
  if (state.status !== 'signed-in' || state.tokenType !== 'session_token') return {request:clean,headers:responseHeaders};
  const auth = state.toAuth();
  const subject = auth?.userId, sessionId = auth?.sessionId, claims = auth?.sessionClaims;
  if (!validId(subject) || !validId(sessionId) || claims?.iss !== cfg.issuer || claims?.sub !== subject || (claims?.azp != null && claims.azp !== cfg.origin)) return {request:clean,headers:responseHeaders};
  const cache = deps.cache || verifiedCache;
  const cacheKey = [cfg.issuer, cfg.origin, env.CLERK_SECRET_KEY, subject, sessionId].join('\0');
  let cached = cache.get(cacheKey);
  if (cached && cached.until <= Date.now()) { cache.delete(cacheKey); cached = null; }
  const [session, account] = cached ? [cached.session,cached.account] : await Promise.all([client.sessions.getSession(sessionId),client.users.getUser(subject)]);
  if (!session || session.id !== sessionId || session.userId !== subject || session.status !== 'active' || !Number.isFinite(session.expireAt) || session.expireAt <= Date.now() || (Number.isFinite(session.abandonAt) && session.abandonAt <= Date.now()) || !account || account.id !== subject || account.banned || account.locked || account.deprovisioned) return {request:clean,headers:responseHeaders};
  const primary = account.emailAddresses?.find(email => email.id === account.primaryEmailAddressId);
  const email = primary?.emailAddress;
  if (primary?.verification?.status !== 'verified' || !safeText(email,254) || !/^[^\s@]+@[^\s@]+$/.test(email)) return {request:clean,headers:responseHeaders};
  if (!cached) {
   if (cache.size >= 500) cache.delete(cache.keys().next().value);
   cache.set(cacheKey,{session,account,until:Math.min(Date.now()+15000,session.expireAt,Number.isFinite(session.abandonAt) ? session.abandonAt : Infinity)});
  }
  const fullName = [account.firstName,account.lastName].filter(v => safeText(v,100) && v.trim()).join(' ').slice(0,200) || email;
  const id = await namespace(cfg.issuer,subject);
  headers.set('oai-authenticated-user-id',id);
  headers.set('oai-authenticated-user-email',email);
  // Headers are byte strings in some runtimes. A non-Latin name is omitted rather than failing authentication.
  try { headers.set('oai-authenticated-user-full-name',fullName); } catch { headers.set('oai-authenticated-user-full-name',email); }
  headers.set('x-review-studio-managed','1');
  if (env.REVIEW_STUDIO_CLERK_OWNER_SUB && env.REVIEW_STUDIO_CLERK_OWNER_SUB === subject) headers.set('x-review-studio-owner','1');
  return {request:new Request(clean,{headers}),headers:responseHeaders,user:{id,email,name:fullName,sessionId}};
 } catch { return {request:clean,response:reply('Managed authentication unavailable',503)}; }
}
