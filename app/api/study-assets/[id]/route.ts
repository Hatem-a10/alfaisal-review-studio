import {readBounded,RequestTooLarge} from '../../../../lib/bounded-request';
import {env} from 'cloudflare:workers';
import {STUDY_ASSETS} from '../../../../lib/study-asset-registry';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});
 if(!env.BUCKET)return new Response('Storage unavailable',{status:503});
 const id=(await params).id,asset=STUDY_ASSETS.find(a=>a.id===id);if(!asset)return new Response('Not found',{status:404});
 const key='study-assets-v1/'+asset.sha;
 const error=(message:string,status:number)=>new Response(message,{status,headers:{'Cache-Control':'no-store'}});
 try{
  let obj=await env.BUCKET.get(key);
  if(!obj&&asset.id==='heart-v1'){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch('https://raw.githubusercontent.com/organui/heart-3d/c72ce6654ff8e282942f97750d3104f55ef4fc3d/public/models/heart.glb',{signal:controller.signal});if(!response.ok)return error('Model download unavailable; try again.',503);
    const bytes=await readBounded(response,asset.size),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==asset.size||sha!==asset.sha)return error('Model integrity check failed',502);
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:asset.type},customMetadata:{sha:asset.sha}});obj=await env.BUCKET.get(key);
   }catch(e){return error(e instanceof RequestTooLarge?'Model integrity check failed':'Model download unavailable; try again.',e instanceof RequestTooLarge?502:503)}finally{clearTimeout(timer)}
  }
  if(!obj)return error('Asset not uploaded',404);
  if(obj.size!==asset.size)return error('Asset integrity check failed',503);
  return new Response(obj.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, max-age=31536000, immutable','ETag':'"'+asset.sha+'"','X-Content-Type-Options':'nosniff','Content-Length':String(asset.size)}})
 }catch{return error('Study asset storage unavailable; try again.',503)}
}
