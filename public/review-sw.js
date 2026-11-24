import {RELEASE_CACHE,cacheKind,validAccount,privateCacheName,privateCacheNames,obsoleteCoreCache,fitsCache} from './phase3-cache-policy.mjs';
const CORE=RELEASE_CACHE+':core',clientsByAccount=new Map();
const store=async(cache,request,response,limited=false)=>{
 if(!response.ok||response.redirected||response.type==='opaque'||!await fitsCache(response))return false;
 try{await cache.put(request,response.clone());if(limited){const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-240)))await cache.delete(key)}return true}catch{return false}
};
async function clearPrivate(account){
 for(const key of privateCacheNames(await caches.keys(),account))await caches.delete(key);
}
async function findPrivate(account,request){
 for(const name of privateCacheNames(await caches.keys(),account)){
  const hit=await caches.match(request,{cacheName:name,ignoreSearch:false});
  if(hit)return hit;
 }
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CORE),r=await fetch('/offline-assets.json',{cache:'no-store'});
 if(!r.ok)throw Error('Offline manifest unavailable');const {assets}=await r.json();
 for(let i=0;i<(assets||[]).length;i+=8)await Promise.all(assets.slice(i,i+8).map(async path=>{
  if(!['core','navigation'].includes(cacheKind(new URL(path,self.location.origin).pathname)))return;
  try{const response=await fetch(path,{cache:'reload',credentials:'same-origin'});await store(cache,path,response)}catch{/* optional asset may be unavailable */}
 }));
 await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 // The application shell is release-specific. Account resources survive a release.
 for(const key of await caches.keys())if(obsoleteCoreCache(key))await caches.delete(key);
 await self.clients.claim();
})())});
self.addEventListener('message',event=>{
 const id=event.source?.id,data=event.data;
 if(data?.type==='ACCOUNT'&&id){if(validAccount(data.key))clientsByAccount.set(id,data.key);else clientsByAccount.delete(id);event.ports[0]?.postMessage({bound:validAccount(data.key)})}
 if(data?.type==='CLEAR_OFFLINE'&&id)event.waitUntil((async()=>{
  const account=clientsByAccount.get(id);if(account)await clearPrivate(account);
  event.ports[0]?.postMessage({cleared:true});
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization'))return;
 const kind=cacheKind(url.pathname);if(!kind)return;
 const account=clientsByAccount.get(event.clientId);if(kind==='private'&&!account)return;
 event.respondWith((async()=>{
  const cache=await caches.open(kind==='private'?privateCacheName(account):CORE);
  if(kind==='core'&&/^\/_studio\/[\w.-]+-[0-9a-f]{16}\.[a-z.]+$/.test(url.pathname)){const hit=await cache.match(request);if(hit)return hit}
  let denied=false;
  try{
   if(kind==='private'){
    const identity=await fetch('/api/account-key',{cache:'no-store',credentials:'same-origin'});
    if(!identity.ok||(await identity.json()).accountKey!==account){
     denied=true;clientsByAccount.delete(event.clientId);
     if(identity.status===401||identity.status===403)await clearPrivate(account).catch(()=>{});
     return await fetch(request);
    }
    if(clientsByAccount.get(event.clientId)!==account){denied=true;return await fetch(request)}
   }
   const response=await fetch(request);
   if(response.status===401||response.status===403){
    if(kind==='private'){denied=true;clientsByAccount.delete(event.clientId);await clearPrivate(account).catch(()=>{})}
    return response;
   }
   // A quota or cache failure must never replace a successful network response with stale bytes.
   if(kind!=='private'||clientsByAccount.get(event.clientId)===account)await store(cache,request,response,kind==='private').catch(()=>{});
   return response;
  }catch{
   if(kind==='private'){
    if(!denied&&clientsByAccount.get(event.clientId)===account){
     const saved=await findPrivate(account,request).catch(()=>null);
     if(saved&&clientsByAccount.get(event.clientId)===account)return saved;
    }
   }else{
    const saved=await cache.match(request,{ignoreSearch:kind!=='private'});if(saved)return saved;
    if(kind==='navigation'){const shell=await cache.match('/index.html')||await cache.match('/');if(shell)return shell}
   }
   return new Response('This item is not downloaded for offline use.',{status:503,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
  }
 })());
});
