export const RELEASE_CACHE='review-studio-sw-v1.79';
export function cacheKind(path){if(path==='/'||path==='/index.html')return 'navigation';if(path==='/api/lesson-data')return 'core';if(path.startsWith('/api/'))return /^\/api\/(study-assets|site-assets|private-media|mock-figure)\//.test(path)?'private':null;if(path.startsWith('/signin')||path.startsWith('/signout')||path.startsWith('/callback'))return null;if(/^\/(?:_studio|icons|fonts|cvp19-figures|vendor)\//.test(path)||/^\/[a-z0-9][a-z0-9_.-]*\.(?:m?js|css|json|webmanifest|svg|woff2?)$/i.test(path))return 'core';return null}
export function validAccount(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)}

// A5-237/238: retain every eligible precache entry, prioritize the shell, and
// limit optional parallel transfers on constrained connections. No private APIs.
export function offlinePrecacheWidth(connection){
 if(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType))return 2;
 if(connection?.effectiveType==='3g')return 4;
 return 8;
}
export function prioritizeOfflineAssets(paths){
 const critical=new Set(['/','/index.html','/review-sw.js','/phase3-cache-policy.mjs','/manifest.webmanifest']);
 const rank=path=>critical.has(path)?0:/^\/_studio\/client-[a-f0-9]{16}\.js$/.test(path)?1:2;
 return [...paths].sort((a,b)=>rank(a)-rank(b));
}
export const MAX_CACHE_BYTES=12000000;
export function privateCacheName(account){if(!validAccount(account))throw Error('Invalid cache account');return 'review-studio-sw-private:student:'+account}
export function privateCacheNames(names,account){
 if(!validAccount(account))return [];
 const current=privateCacheName(account),legacy=names.filter(name=>/^review-studio-sw-v\d+\.\d+:student:[a-f0-9]{64}$/.test(name)&&name.endsWith(':student:'+account));
 return [current,...legacy.sort().reverse()];
}
export function obsoleteCoreCache(name,release=RELEASE_CACHE){return /^review-studio-sw-v\d+\.\d+:core$/.test(name)&&name!==release+':core'}
// Check the decoded bytes as well as the optional declared size; never consume the caller's stream.
export async function fitsCache(response,limit=MAX_CACHE_BYTES){
 const declared=Number(response.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>limit)return false;
 const reader=response.clone().body?.getReader();if(!reader)return true;
 let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)return true;size+=value.byteLength;if(size>limit){reader.cancel().catch(()=>{});return false}}}
 catch{reader.cancel().catch(()=>{});return false}finally{reader.releaseLock()}
}
