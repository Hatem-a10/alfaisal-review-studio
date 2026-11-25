import {readBounded,RequestTooLarge} from '../../../../lib/bounded-request';
import {env} from 'cloudflare:workers';
import {STUDY_ASSETS} from '../../../../lib/study-asset-registry';
export const dynamic='force-dynamic';
const byId=new Map<string,(typeof STUDY_ASSETS)[number]>();
for(const asset of STUDY_ASSETS)if(!byId.has(asset.id))byId.set(asset.id,asset);
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!request.headers.get('oai-authenticated-user-id'))return new Response('Sign in required',{status:401});
 if(!env.BUCKET)return new Response('Storage unavailable',{status:503});
 const id=(await params).id,asset=byId.get(id);if(!asset)return new Response('Not found',{status:404});
 const key='study-assets-v1/'+asset.sha;
 const error=(message:string,status:number)=>new Response(message,{status,headers:{'Cache-Control':'no-store'}});
 try{
  const tag='"'+asset.sha+'"',ifRange=request.headers.get('if-range');
  const range=(!ifRange||ifRange===tag)?request.headers.get('range'):null;
  const unsatisfiable=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${asset.size}`,'Accept-Ranges':'bytes','Cache-Control':'no-store'}});
  let start=0,end=asset.size-1,status=200;
  if(range){
   const m=/^bytes=(\d*)-(\d*)$/.exec(range);
   if(!m||(!m[1]&&!m[2]))return unsatisfiable();
   if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return unsatisfiable();start=Math.max(0,asset.size-suffix);}
   else{start=Number(m[1]);if(m[2]){const last=Number(m[2]);if(!Number.isSafeInteger(last))return unsatisfiable();end=Math.min(end,last);}}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=asset.size||end<start)return unsatisfiable();
   status=206;
  }
  const rangeOptions=status===206?{range:{offset:start,length:end-start+1}}:undefined;
  let obj=await env.BUCKET.get(key,rangeOptions);
  if(!obj&&asset.id==='heart-v1'){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch('https://raw.githubusercontent.com/organui/heart-3d/c72ce6654ff8e282942f97750d3104f55ef4fc3d/public/models/heart.glb',{signal:controller.signal});if(!response.ok)return error('Model download unavailable; try again.',503);
    const bytes=await readBounded(response,asset.size),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==asset.size||sha!==asset.sha)return error('Model integrity check failed',502);
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:asset.type},customMetadata:{sha:asset.sha}});obj=await env.BUCKET.get(key,rangeOptions);
   }catch(e){return error(e instanceof RequestTooLarge?'Model integrity check failed':'Model download unavailable; try again.',e instanceof RequestTooLarge?502:503)}finally{clearTimeout(timer)}
  }
  if(!obj)return error('Asset not uploaded',404);
  if(obj.size!==asset.size)return error('Asset integrity check failed',503);
  const headers=new Headers({'Content-Type':asset.type,'Cache-Control':'private, max-age=31536000, immutable','ETag':tag,'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Length':String(end-start+1)});
  if(status===206)headers.set('Content-Range',`bytes ${start}-${end}/${asset.size}`);
  return new Response(obj.body,{status,headers});
 }catch{return error('Study asset storage unavailable; try again.',503)}
}
