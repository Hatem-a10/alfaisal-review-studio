import manifest from './private-media-manifest.json';

export const PRIVATE_MEDIA = manifest;
const paths=new Map(manifest.map(asset=>['/'+asset.path,asset]));
export const mediaKey=(sha:string)=>'publisher-media-v1/'+sha;
export const mediaPrefix='publisher-media-v1/';
export const hashBytes=async(bytes:ArrayBuffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
 .map(value=>value.toString(16).padStart(2,'0')).join('');
export const manifestHash=()=>hashBytes(new TextEncoder().encode(JSON.stringify(manifest)).buffer);

export function privateAsset(request:Request){
 if(request.method!=='GET'&&request.method!=='HEAD')return;
 try{return paths.get(decodeURI(new URL(request.url).pathname));}catch{return;}
}

export async function readPrivateMedia(request:Request,bucket:R2Bucket|undefined,ownerId?:string){
 const asset=privateAsset(request);
 if(!asset)return null;
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return new Response('Sign in required',{status:401});
 if(ownerId&&user!==ownerId)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 if(!bucket)return null;
 const key=mediaKey(asset.sha);
 const file=request.method==='HEAD'?await bucket.head(key):await bucket.get(key);
 if(!file||file.size!==asset.size||file.customMetadata?.sha!==asset.sha)return null;
 const tag='"'+asset.sha+'"';
 const headers={'Content-Type':asset.type,'Content-Length':String(file.size),'ETag':tag,
  'Cache-Control':'private, max-age=3600, must-revalidate','X-Content-Type-Options':'nosniff'};
 if(request.headers.get('if-none-match')===tag){
  const cacheHeaders=new Headers(headers);cacheHeaders.delete('Content-Length');
  return new Response(null,{status:304,headers:cacheHeaders});
 }
 const body='body' in file?(file as R2ObjectBody).body:null;
 return new Response(body,{headers});
}
