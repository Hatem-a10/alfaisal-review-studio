import handler from 'vinext/server/fetch-handler';
import {authenticateStaging} from '../lib/staging-auth.mjs';
import {PUBLISHER_PACKS,servePack} from '../lib/publisher-packs';
import {assetFor,serveAsset} from '../lib/site-assets';
import {readPrivateMedia,PRIVATE_MEDIA} from '../lib/private-media';

export default {
 async fetch(incoming:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  if(env.REVIEW_STUDIO_DEPLOYMENT!=='staging')return new Response('Staging configuration required',{status:503});
  // Cloudflare supplies this in deployed requests. Only loopback development gets a local value.
  if(import.meta.env.DEV&&['127.0.0.1','localhost'].includes(new URL(incoming.url).hostname)){
   const h=new Headers(incoming.headers);h.set('CF-Connecting-IP','127.0.0.1');incoming=new Request(incoming,{headers:h});
  }
  const auth=await authenticateStaging(incoming,env);if(auth.response)return auth.response;
  const request=auth.request;let path;try{path=decodeURIComponent(new URL(request.url).pathname).slice(1)}catch{return new Response('Invalid path',{status:400})}
  if(path.startsWith('materials/')||assetFor(path)){if(!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});if(assetFor(path)){const stored=await serveAsset(request,env.BUCKET,path,request.method==='HEAD');if(stored.status!==404)return stored;}return env.ASSETS.fetch(request);}
  if(path==='staging/health')return Response.json({environment:'staging',authentication:'synthetic-signed-session',database:!!env.DB,storage:!!env.BUCKET},{headers:{'Cache-Control':'no-store'}});
  if((request.method==='GET'||request.method==='HEAD')&&PUBLISHER_PACKS.some(a=>a.path===path)){const served=await servePack(request);if(served.status!==503)return served;if(!PUBLISHER_PACKS.find(a=>a.path===path)?.private||request.headers.has('oai-authenticated-user-id'))return env.ASSETS.fetch(request);return served;}
  if(PRIVATE_MEDIA.some(a=>a.path===path)&&!request.headers.has('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});
  const media=await readPrivateMedia(request,env.BUCKET);if(media)return media;
  const response=await handler.fetch(request,env,ctx);
  if(response.headers.get('content-type')?.includes('text/html')&&['','index.html'].includes(path)){
   const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Cache-Control','no-store');headers.set('X-Review-Studio-Environment','staging');
   const html=(await response.text()).replace('</head>','<script src="/staging-runtime.js" defer></script></head>');
   return new Response(html,{status:response.status,headers});
  }
  return response;
 }
};
