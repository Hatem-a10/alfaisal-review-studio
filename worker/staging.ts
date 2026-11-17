import handler from 'vinext/server/fetch-handler';
import {authenticateStaging} from '../lib/staging-auth.mjs';
import {authenticateManaged} from '../lib/managed-auth.mjs';
import {managedPage,managedPublicConfig,privacyPage} from '../lib/managed-auth-pages.mjs';
import {managedAccount,managedAccountRoute} from '../lib/managed-accounts.mjs';
import {PUBLISHER_PACKS,servePack} from '../lib/publisher-packs';
import {assetFor,serveAsset} from '../lib/site-assets';
import {readPrivateMedia,PRIVATE_MEDIA} from '../lib/private-media';

const stagingWorker = {
 async fetch(incoming:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  if(env.REVIEW_STUDIO_DEPLOYMENT!=='staging')return new Response('Staging configuration required',{status:503});
  // Cloudflare supplies this in deployed requests. Only loopback development gets a local value.
  if(import.meta.env.DEV&&['127.0.0.1','localhost'].includes(new URL(incoming.url).hostname)){
   const h=new Headers(incoming.headers);h.set('CF-Connecting-IP','127.0.0.1');incoming=new Request(incoming,{headers:h});
  }
  const config=env as typeof env & Record<string,unknown>,managed=config.REVIEW_STUDIO_AUTH_PROVIDER==='clerk';
  const originalPath=new URL(incoming.url).pathname;
  if(managed){
   if(['GET','HEAD'].includes(incoming.method)&&['/managed-auth-client.js','/managed-auth.css','/staging-runtime.js','/staging-ui.css'].includes(originalPath))return env.ASSETS.fetch(incoming);
   if(['/staging/signin','/signin-with-chatgpt','/staging/signout','/signout-with-chatgpt'].includes(originalPath))return Response.redirect(new URL(originalPath.includes('signout')?'/auth/sign-out':'/auth/sign-in',incoming.url),303);
   if(incoming.method==='GET'){
    try{
     if(originalPath==='/auth/config')return Response.json(managedPublicConfig(config),{headers:{'Cache-Control':'no-store'}});
     if(originalPath==='/auth/privacy')return privacyPage();
     if(['/auth/sign-in','/auth/sign-up','/auth/sign-out'].includes(originalPath))return managedPage(config,originalPath.split('/').at(-1));
    }catch{return new Response('Managed authentication configuration unavailable',{status:503,headers:{'Cache-Control':'no-store'}})}
   }
  }
  const auth=managed?await authenticateManaged(incoming,config):await authenticateStaging(incoming,env);if(auth.response)return auth.response;
  const finish=(response:Response)=>{if(!auth.headers)return response;const headers=new Headers(response.headers);for(const cookie of (typeof auth.headers.getSetCookie==='function'?auth.headers.getSetCookie():[auth.headers.get('Set-Cookie')].filter(Boolean)))headers.append('Set-Cookie',cookie);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})};
  return finish(await (async()=>{

  const request=auth.request;let path;try{path=decodeURIComponent(new URL(request.url).pathname).slice(1)}catch{return new Response('Invalid path',{status:400})}
  if(managed){
   let row:Record<string,unknown>|null=null;
   if(auth.user){
    try{row=await env.DB.prepare('SELECT * FROM review_accounts WHERE id=?').bind(auth.user.id).first();if(!row||['','index.html'].includes(path)||path.startsWith('auth/'))row=await managedAccount(env.DB,auth.user);}
    catch{return new Response('Account database unavailable',{status:503,headers:{'Cache-Control':'no-store'}})}
    if(row?.disabled)return new Response('This account is disabled. Contact the site owner.',{status:403,headers:{'Cache-Control':'no-store'}});
   }
   if(path==='auth/session'||path==='staging/session')return Response.json({authenticated:!!auth.user},{headers:{'Cache-Control':'no-store'}});
   if(['auth/account','auth/admin/accounts','api/admin-auth'].includes(path))return await managedAccountRoute(request,config,auth.user,row||{});
   if(path==='api/capabilities')return Response.json({admin:request.headers.get('x-review-studio-owner')==='1',adminSettingsUnlocked:request.headers.get('x-review-studio-owner')==='1'&&row?.admin_panel_unlocked===1},{headers:{'Cache-Control':'no-store'}});
  }
  if(path.startsWith('materials/')||assetFor(path)){if(!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});if(assetFor(path)){const stored=await serveAsset(request,env.BUCKET,path,request.method==='HEAD');if(stored.status!==404)return stored;}return env.ASSETS.fetch(request);}
  if(['','index.html'].includes(path)&&!request.headers.has('oai-authenticated-user-id'))return Response.redirect(new URL(managed?'/auth/sign-in':'/staging/signin?return_to=%2F',request.url),303);
  if(path==='staging/health')return Response.json({environment:'staging',authentication:managed?'clerk':'synthetic-signed-session',database:!!env.DB,storage:!!env.BUCKET},{headers:{'Cache-Control':'no-store'}});
  if((request.method==='GET'||request.method==='HEAD')&&PUBLISHER_PACKS.some(a=>a.path===path)){const served=await servePack(request);if(served.status!==503)return served;if(!PUBLISHER_PACKS.find(a=>a.path===path)?.private||request.headers.has('oai-authenticated-user-id'))return env.ASSETS.fetch(request);return served;}
  if(PRIVATE_MEDIA.some(a=>a.path===path)&&!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});
  const media=await readPrivateMedia(request,env.BUCKET);if(media)return media;
  // Post-build bundles/styles are not in vinext's build-time route snapshot.
  const assetResponse=!path.startsWith('api/')&&['GET','HEAD'].includes(request.method)?await env.ASSETS.fetch(request):null;
  const response=assetResponse&&assetResponse.status!==404?assetResponse:await handler.fetch(request,env,ctx);
  if(response.headers.get('content-type')?.includes('text/html')&&['','index.html'].includes(path)){
   const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Cache-Control','no-store');headers.set('X-Review-Studio-Environment','staging');
   const html=(await response.text()).replace('</head>',(managed?'<script>window.REVIEW_STUDIO_FRESH_ACCOUNTS=true</script><script src="/managed-auth-client.js" defer></script>':'')+'<link rel="stylesheet" href="/staging-ui.css"><script src="/staging-runtime.js" defer></script></head>');
   return new Response(html,{status:response.status,headers});
  }
  return response;
  })());
 }
};

export default stagingWorker;
