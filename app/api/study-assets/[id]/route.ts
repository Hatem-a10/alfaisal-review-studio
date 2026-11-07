import {env} from 'cloudflare:workers';
import {STUDY_ASSETS} from '../../../../lib/study-asset-registry';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return new Response('Sign in required',{status:401});
 if(env.REVIEW_OWNER_ID&&user!==env.REVIEW_OWNER_ID)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 if(!env.BUCKET)return new Response('Storage unavailable',{status:503});
 const id=(await params).id,asset=STUDY_ASSETS.find(a=>a.id===id);if(!asset)return new Response('Not found',{status:404});
 const key='study-assets-v1/'+asset.sha;let obj=await env.BUCKET.get(key);
 if(!obj&&asset.id==='heart-v1'){
  const response=await fetch('https://raw.githubusercontent.com/organui/heart-3d/c72ce6654ff8e282942f97750d3104f55ef4fc3d/public/models/heart.glb');if(!response.ok)return new Response('Model download unavailable; try again.',{status:503});
  const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==asset.size||sha!==asset.sha)return new Response('Model integrity check failed',{status:502});await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:asset.type}});obj=await env.BUCKET.get(key);
 }
 if(!obj)return new Response('Asset not uploaded',{status:404});
 return new Response(obj.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, max-age=31536000, immutable','ETag':'"'+asset.sha+'"','X-Content-Type-Options':'nosniff','Content-Length':String(asset.size)}})
}
