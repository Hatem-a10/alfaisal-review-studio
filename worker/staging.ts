import handler from 'vinext/server/fetch-handler';
import release from '../public/site-release.json';
import {allowProductionWrite,isProductionDatabase,mayUseProduction,productionPolicy} from '../lib/production-access.mjs';
import {authenticateStaging} from '../lib/staging-auth.mjs';
import {authenticateManaged,managedAuthConfig} from '../lib/managed-auth.mjs';
import {managedPage,managedPublicConfig,privacyPage} from '../lib/managed-auth-pages.mjs';
import {managedAccount,managedAccountRoute} from '../lib/managed-accounts.mjs';
import {accountControl,adminResponse,adminWriteGate,auditWriter,controlRoute,controls,countControlEvent,verifiedAdminChallenge} from '../lib/admin-control.mjs';
import {PUBLISHER_PACKS,servePack} from '../lib/publisher-packs';
import {assetFor,serveAsset} from '../lib/site-assets';
import {readPrivateMedia,PRIVATE_MEDIA} from '../lib/private-media';
import {readClientError} from '../lib/client-error.mjs';
import {stampOfflineAccount} from '../lib/offline-account.mjs';
import {managedDashboardLanding} from '../lib/managed-login-landing.mjs';

// A5-043: only Control Center requests load their academic/content/resource
// handler modules; ordinary student boot, assets and progress routes avoid eagerly
// evaluating these Admin-only dependencies. ESM caching makes subsequent calls cheap.
// A5-042: narrow Control Center module loading to the handlers needed by the
// specific authorized route. Shared built-in overview/analytics/audit routes need
// none. Student routes retain their original three-handler precedence.
async function controlHandlers(student:boolean,section:string){
 if(!student){
  if(section==='academics')return [(await import('../lib/admin-academics.mjs')).academicAdmin];
  if(section==='resources')return [(await import('../lib/admin-resources.mjs')).resourceAdmin];
  if(section==='reports'||section==='announcements')return [(await import('../lib/admin-content.mjs')).contentAdmin];
  return [];
 }
 const [academic,content,resource]=await Promise.all([
  import('../lib/admin-academics.mjs'),
  import('../lib/admin-content.mjs'),
  import('../lib/admin-resources.mjs')
 ]);
 return [academic.academicStudent,content.contentStudent,resource.resourceStudent];
}

const stagingWorker = {
 async fetch(incoming:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const environment = env.REVIEW_STUDIO_DEPLOYMENT as string;
  const production = environment === 'production';
  if (!production && environment !== 'staging') return new Response('Cloudflare configuration required',{status:503});
  const config = env as typeof env & Record<string,unknown>;
  const managed = config.REVIEW_STUDIO_AUTH_PROVIDER === 'clerk';
  const policy=production?productionPolicy(config):null;
  if (production && (!policy || !managed || managedAuthConfig(config)?.origin !== new URL(incoming.url).origin)) {
   return new Response('Managed authentication configuration unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
  }
  // Cloudflare supplies this in deployed requests. Only loopback development gets a local value.
  if(import.meta.env.DEV&&['127.0.0.1','localhost'].includes(new URL(incoming.url).hostname)){
   const h=new Headers(incoming.headers);h.set('CF-Connecting-IP','127.0.0.1');incoming=new Request(incoming,{headers:h});
  }
  if(managed){const landing=managedDashboardLanding(incoming);if(landing)return landing;}
  const originalPath=new URL(incoming.url).pathname;
  let authPath;
  try{authPath=decodeURIComponent(originalPath).replace(/\/+$/,'');}
  catch{return adminResponse({error:'Invalid path.'},400);}
  if(policy?.restricted&&authPath==='/auth/sign-up')return adminResponse({error:'Registration is closed.'},404);
  if(managed){
   if(['GET','HEAD'].includes(incoming.method)&&['/managed-auth-client.js','/managed-auth.css','/staging-runtime.js','/staging-ui.css'].includes(originalPath))return env.ASSETS.fetch(incoming);
   if(['/staging/signin','/signin-with-chatgpt','/staging/signout','/signout-with-chatgpt'].includes(originalPath))return Response.redirect(new URL(originalPath.includes('signout')?'/auth/sign-out':'/auth/sign-in',incoming.url),303);
   if(incoming.method==='GET'){
    try{
     if(originalPath==='/auth/config')return Response.json({...managedPublicConfig(config),registrationClosed:policy?.restricted===true},{headers:{'Cache-Control':'no-store','X-Review-Studio-Version':release.displayVersion}});
     if(originalPath==='/auth/privacy')return privacyPage();
     if(['/auth/sign-in','/auth/sign-up','/auth/sign-out'].includes(originalPath))return managedPage(config,originalPath.split('/').at(-1));
    }catch{return new Response('Managed authentication configuration unavailable',{status:503,headers:{'Cache-Control':'no-store'}})}
   }
  }
  const auth=managed?await authenticateManaged(incoming,config):await authenticateStaging(incoming,env);if(auth.response)return auth.response;
  const finish=async(response:Response)=>{response=await stampOfflineAccount(response,auth.request);if(!auth.headers)return response;const headers=new Headers(response.headers);for(const cookie of (typeof auth.headers.getSetCookie==='function'?auth.headers.getSetCookie():[auth.headers.get('Set-Cookie')].filter(Boolean)))headers.append('Set-Cookie',cookie);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})};
  if(production&&auth.user){
   if(!mayUseProduction(policy,auth.user))return finish(adminResponse({error:'This release is restricted to approved reviewers.'},403));
   if(!await isProductionDatabase(env.DB))return finish(adminResponse({error:'Production database verification unavailable.'},503));
  }
  return finish(await (async()=>{

  const request=auth.request;let path;try{path=decodeURIComponent(new URL(request.url).pathname).slice(1)}catch{return new Response('Invalid path',{status:400})}
  let observe: ((response:Response)=>void)|undefined;
  let legacyAudit: ReturnType<typeof auditWriter>|undefined;
  // Client error reports are bounded, allowlisted and contain no arbitrary strings or URLs.
  if(path==='api/client-error'&&request.method==='POST'){
   if(!request.headers.has('oai-authenticated-user-id'))return adminResponse({error:'Sign in required.'},401);
   try{
    if(production&&(!auth.user||!await allowProductionWrite(env.DB,auth.user.id,path,request.method)))return new Response(null,{status:429,headers:{'Cache-Control':'no-store'}});
    const report=await readClientError(request);
    if(report)console.error('[client-error]',JSON.stringify({...report,environment}));
   }catch{}
   return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }
  if(managed){
   let row:Record<string,unknown>|null=null;
   const owner=request.headers.get('x-review-studio-owner')==='1';
   if(auth.user){
    try{
     row=await env.DB.prepare('SELECT * FROM review_accounts WHERE id=?').bind(auth.user.id).first();
     if(row?.disabled&&!owner)return adminResponse({error:'This account is suspended.'},403);
     if(!row||['','index.html'].includes(path)||path.startsWith('auth/'))row=await managedAccount(env.DB,auth.user);
     else if(path==='api/progress'&&Date.now()-Date.parse(String(row?.last_seen_at))>3600000){
      ctx.waitUntil(env.DB.prepare('UPDATE review_accounts SET last_seen_at=? WHERE id=? AND last_seen_at<?').bind(new Date().toISOString(),auth.user.id,new Date(Date.now()-3600000).toISOString()).run().catch(()=>{}));
     }
    }catch{return adminResponse({error:'Account database unavailable.'},503);}
   }
   if(path==='auth/session'||path==='staging/session')return adminResponse({authenticated:!!auth.user});
   const canonical=path.replace(/\/+$/,'');
   if(canonical.startsWith('api/control-center/')){
    const student=canonical.startsWith('api/control-center/student/');
    let handlers;
    try{handlers=await controlHandlers(student,canonical.split('/')[student?4:2])}catch{return adminResponse({error:'Admin feature modules unavailable.'},503)}
    const response=await controlRoute({request,env:config,user:auth.user,row,owner,path:'/'+canonical,handlers});
    const download=/^api\/control-center\/student\/resources\/([a-f0-9-]{36})\/download$/i.exec(canonical);
    if(response?.ok&&download)ctx.waitUntil(countControlEvent(env.DB,'resource-open:'+download[1]).catch(()=>{}));
    return response;
   }
   if(canonical==='auth/admin/accounts'){
    if(!auth.user)return adminResponse({error:'Sign in required.'},401);
    return owner&&row?.admin_panel_unlocked===1
     ?adminResponse({error:'Use the Admin Control Center.'},410)
     :adminResponse({error:'Administrator access required.'},403);
   }
   const write=!['GET','HEAD','OPTIONS'].includes(request.method);
   if(write&&auth.user){
    try{
     const blocked=adminWriteGate(canonical,request.method,await controls(env.DB));
     if(blocked)return adminResponse({error:blocked},503);
     if(production&&!await allowProductionWrite(env.DB,auth.user.id,canonical,request.method)){
      return adminResponse({error:'Write limit reached. Your device copy is retained. Try again later.'},429);
     }
     if(canonical==='api/academic-config')return adminResponse({error:'Publish an academic revision in the Admin Control Center.'},owner?409:403);
     if(canonical==='api/shared-decks'||canonical.startsWith('api/admin-assets/')){
      if(!owner||row?.admin_panel_unlocked!==1)return adminResponse({error:'Owner authorization required.'},403);
      if(!await verifiedAdminChallenge(env.DB,auth.user,config))return adminResponse({error:'Confirm the Admin phrase in the Admin Control Center first.'},428);
      legacyAudit=auditWriter(env.DB,auth.user,'owner');
      await legacyAudit.mutate([],'legacy.write-requested',canonical);
     }
     const sync=canonical==='api/progress';
     const upload=/^api\/(materials|decks|shared-decks)$/.test(canonical)&&request.method==='POST';
     if(sync||upload)observe=response=>{
      if(response.status>=500||(upload&&response.status>=400)){
       ctx.waitUntil(countControlEvent(env.DB,sync?'sync-failed':'upload-failed').catch(()=>{}));
      }
     };
    }catch{return adminResponse({error:'Site controls are unavailable.'},503);}
   }
   if(['auth/account','api/admin-auth'].includes(canonical)){
    const result=await managedAccountRoute(request,config,auth.user,row||{});
    if(canonical==='auth/account'&&request.method==='GET'&&auth.user&&result?.ok){
     try {return adminResponse({...await result.json(),...await accountControl(env.DB,auth.user.id)});}
     catch{return adminResponse({error:'Account settings are temporarily unavailable.'},503);}
    }
    return result;
   }
   if(canonical==='api/capabilities')return adminResponse({admin:owner,adminSettingsUnlocked:owner&&row?.admin_panel_unlocked===1});
  }
  if(path.startsWith('materials/')||assetFor(path)){if(!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});if(assetFor(path)){const stored=await serveAsset(request,env.BUCKET,path,request.method==='HEAD');if(stored.status!==404)return stored;}return env.ASSETS.fetch(request);}
  if(['','index.html'].includes(path)&&!request.headers.has('oai-authenticated-user-id'))return Response.redirect(new URL(managed?'/auth/sign-in':'/staging/signin?return_to=%2F',request.url),303);
  if(production && path==='health'){
   if(!auth.user)return adminResponse({error:'Sign in required.'},401);
   return adminResponse({environment,authentication:'clerk',database:true,storage:!!env.BUCKET,restricted:policy?.restricted});
  }
  if(production && !auth.user)return new Response('Sign in required',{status:401,headers:{'Cache-Control':'no-store'}});
  if(path==='staging/health'&&!production)return Response.json({environment:'staging',authentication:managed?'clerk':'synthetic-signed-session',database:!!env.DB,storage:!!env.BUCKET},{headers:{'Cache-Control':'no-store'}});
  if((request.method==='GET'||request.method==='HEAD')&&PUBLISHER_PACKS.some(a=>a.path===path)){const served=await servePack(request);if(served.status!==503)return served;if(!PUBLISHER_PACKS.find(a=>a.path===path)?.private||request.headers.has('oai-authenticated-user-id'))return env.ASSETS.fetch(request);return served;}
  if(PRIVATE_MEDIA.some(a=>a.path===path)&&!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});
  const media=await readPrivateMedia(request,env.BUCKET);if(media)return media;
  // Post-build bundles/styles are not in vinext's build-time route snapshot.
  const assetResponse=!path.startsWith('api/')&&['GET','HEAD'].includes(request.method)?await env.ASSETS.fetch(request):null;
  const response=assetResponse&&assetResponse.status!==404?assetResponse:await handler.fetch(request,env,ctx);
  observe?.(response);
  if(legacyAudit)await legacyAudit.mutate([],response.ok?'legacy.write-completed':'legacy.write-failed',path);
  if(response.headers.get('content-type')?.includes('text/html')&&['','index.html'].includes(path)){
   const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Cache-Control','no-store');headers.set('X-Review-Studio-Environment',environment);
   const html=(await response.text()).replace('</head>',(managed?'<script>window.REVIEW_STUDIO_FRESH_ACCOUNTS=true</script><script src="/managed-auth-client.js" defer></script><script src="/admin-student-tools.js" defer></script><script src="/admin-academic-runtime.js" defer></script>':'')+'<link rel="stylesheet" href="/staging-ui.css">'+(production?'':'<script src="/staging-runtime.js" defer></script>')+'</head>');
   return new Response(html,{status:response.status,headers});
  }
  return response;
  })());
 }
};

export default stagingWorker;
