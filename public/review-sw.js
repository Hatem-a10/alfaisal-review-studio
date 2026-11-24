import {RELEASE_CACHE,cacheKind,validAccount,privateCacheName,privateCacheNames,obsoleteCoreCache,fitsCache,offlinePrecacheWidth,prioritizeOfflineAssets} from './phase3-cache-policy.mjs';
const CORE=RELEASE_CACHE+':core',clientsByAccount=new Map(),accountEpoch=new Map(),privateWrites=new Map(),clearing=new Map(),staticFlights=new Map();
const epoch=account=>accountEpoch.get(account)||0;
const accountHeader='X-Review-Cache-Account';
const unavailable=(message,status=409)=>new Response(message,{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
const store=async(cache,request,response,limited=false,guard=()=>true)=>{
 if(!response.ok||response.redirected||response.type==='opaque'||!await fitsCache(response)||!guard())return false;
 try{await cache.put(request,response.clone());const keys=limited?await cache.keys():[];if(limited&&keys.length>240)for(const key of keys.slice(0,keys.length-240))await cache.delete(key);return true}catch{return false}
};
function clearPrivate(account){
 if(clearing.has(account))return clearing.get(account);
 accountEpoch.set(account,epoch(account)+1);
 const task=(async()=>{await Promise.allSettled([...(privateWrites.get(account)||[])]);for(const key of privateCacheNames(await caches.keys(),account))await caches.delete(key)})().finally(()=>clearing.delete(account));
 clearing.set(account,task);return task;
}
async function storePrivate(account,cache,request,response,guard){
 if(!guard())return false;
 const writes=privateWrites.get(account)||new Set();privateWrites.set(account,writes);
 const task=store(cache,request,response,true,guard);writes.add(task);
 try{return await task}finally{writes.delete(task);if(!writes.size)privateWrites.delete(account)}
}
async function findPrivate(account,request){
 for(const name of privateCacheNames(await caches.keys(),account)){
  const hit=await caches.match(request,{cacheName:name,ignoreSearch:false});
  if(hit){const tagged=hit.headers.get(accountHeader);if(tagged===account||!tagged&&!new URL(request.url).pathname.startsWith('/api/mock-figure/'))return hit;}
 }
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CORE),r=await fetch('/offline-assets.json',{cache:'no-store'});
 if(!r.ok)throw Error('Offline manifest unavailable');const {assets}=await r.json();
 // Critical shell and executable assets run before speculative offline resources.
 const eligible=prioritizeOfflineAssets((assets||[]).filter(path=>['core','navigation'].includes(cacheKind(new URL(path,self.location.origin).pathname))));
 const width=offlinePrecacheWidth(self.navigator?.connection);
 for(let i=0;i<eligible.length;i+=width)await Promise.all(eligible.slice(i,i+width).map(async path=>{
  try{const response=await fetch(path,{cache:'reload',credentials:'same-origin'});await store(cache,path,response)}catch{/* optional asset may be unavailable */}
 }));
 await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 // The application shell is release-specific. Account resources survive a release.
 for(const key of await caches.keys())if(obsoleteCoreCache(key))await caches.delete(key);
 if(self.registration?.navigationPreload)await self.registration.navigationPreload.enable().catch(()=>{});
 await self.clients.claim();
})())});
self.addEventListener('message',event=>{
 const id=event.source?.id,data=event.data;
 if(data?.type==='ACCOUNT'&&id){if(validAccount(data.key))clientsByAccount.set(id,data.key);else clientsByAccount.delete(id);event.ports[0]?.postMessage({bound:validAccount(data.key)})}
 if(data?.type==='CLEAR_OFFLINE'&&id)event.waitUntil((async()=>{
  const account=clientsByAccount.get(id);if(!account){event.ports[0]?.postMessage({cleared:false,error:'No verified account is bound.'});return}
  try{await clearPrivate(account);event.ports[0]?.postMessage({cleared:true})}catch{event.ports[0]?.postMessage({cleared:false,error:'Offline files could not be cleared. Retry.'})}
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization'))return;
 const kind=cacheKind(url.pathname);if(!kind)return;
 const account=clientsByAccount.get(event.clientId);if(kind==='private'&&!account)return;
 const startedEpoch=epoch(account),guard=()=>clientsByAccount.get(event.clientId)===account&&!clearing.has(account)&&epoch(account)===startedEpoch;
 event.respondWith((async()=>{
  const cache=await caches.open(kind==='private'?privateCacheName(account):CORE).catch(()=>null);
  // A5-209: if the browser has declared offline, serve only already cached PUBLIC
  // core files from this exact release cache without a guaranteed-to-fail probe.
  // Navigation and private resources retain their existing verification paths.
  if(kind==='core'&&self.navigator?.onLine===false){
   const saved=await cache?.match(request,{ignoreSearch:true}).catch(()=>null);
   if(saved)return saved;
  }
  if(kind==='core'&&/^\/_studio\/[\w.-]+-[0-9a-f]{16}\.[a-z.]+$/.test(url.pathname)){const hit=await cache?.match(request).catch(()=>null);if(hit)return hit}
  let denied=false;
  try{
   if(kind==='private'){
    const identity=await fetch('/api/account-key',{cache:'no-store',credentials:'same-origin'});
    let accountKey=null;if(identity.ok){try{accountKey=(await identity.json())?.accountKey}catch{denied=true;return unavailable('Identity verification unavailable. Retry.',503)}}
    if(!identity.ok||accountKey!==account){
     denied=true;if(clientsByAccount.get(event.clientId)===account)clientsByAccount.delete(event.clientId);
     if(identity.status===401||identity.status===403)await clearPrivate(account).catch(()=>{});
     return unavailable('Account identity changed or is unavailable. Sign in or retry.',identity.ok?409:identity.status===401||identity.status===403?identity.status:503);
    }
    if(clientsByAccount.get(event.clientId)!==account){denied=true;return unavailable('Account changed. Retry this download.')}
   }
   // The browser can start eligible navigation work while this service worker wakes.
   // A preload response preserves ordinary redirects/status; private API requests bypass it.
   if(kind==='navigation'&&event.preloadResponse){
    let preloaded=null;
    try{preloaded=await event.preloadResponse}catch{}
    if(preloaded){if(cache)await store(cache,request,preloaded).catch(()=>{});return preloaded}
   }
   // Only coalesce immutable public hashed assets. Private and conditional requests
   // retain their own account verification, network response and fallback path.
   if(kind==='core'&&/^\/_studio\/[\w.-]+-[0-9a-f]{16}\.[a-z.]+$/.test(url.pathname)&&!url.search&&!request.headers.has('range')&&!request.headers.has('if-none-match')&&!request.headers.has('if-modified-since')){
    const key=url.href;let pending=staticFlights.get(key);
    if(!pending&&staticFlights.size<32){
     pending=(async()=>{const response=await fetch(request);if(cache)await store(cache,request,response).catch(()=>{});return response})().finally(()=>staticFlights.delete(key));
     staticFlights.set(key,pending);
    }
    if(pending)return (await pending).clone();
   }
   const response=kind==='private'?await fetch(request,{cache:'no-store'}):await fetch(request);
   if(response.status===401||response.status===403){
    if(kind==='private'){denied=true;if(clientsByAccount.get(event.clientId)===account)clientsByAccount.delete(event.clientId);await clearPrivate(account).catch(()=>{})}
    return response;
   }
   if(kind==='private'&&response.ok&&(response.headers.get(accountHeader)!==account||clientsByAccount.get(event.clientId)!==account)){
    denied=true;if(clientsByAccount.get(event.clientId)===account)clientsByAccount.delete(event.clientId);
    return unavailable('Account changed or the download could not be verified. Retry after signing in.');
   }
   // A quota or cache failure must never replace a successful network response with stale bytes.
   if(cache){if(kind==='private')await storePrivate(account,cache,request,response,guard).catch(()=>{});else await store(cache,request,response).catch(()=>{})}
   if(kind==='private'&&response.ok&&clientsByAccount.get(event.clientId)!==account)return unavailable('Account changed. Retry this download.');
   return response;
  }catch{
   if(kind==='private'){
    if(!denied&&clientsByAccount.get(event.clientId)===account){
     const saved=guard()?await findPrivate(account,request).catch(()=>null):null;
     if(saved&&guard())return saved;
    }
   }else{
    const saved=await cache?.match(request,{ignoreSearch:kind!=='private'}).catch(()=>null);if(saved)return saved;
    if(kind==='navigation'){const shell=await cache?.match('/index.html').catch(()=>null)||await cache?.match('/').catch(()=>null);if(shell)return shell}
   }
   return new Response('This item is not downloaded for offline use.',{status:503,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
  }
 })());
});
