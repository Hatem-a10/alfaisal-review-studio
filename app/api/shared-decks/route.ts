import {env} from 'cloudflare:workers';
import {sameOrigin} from '../../../lib/academic-config.mjs';
import {requestOwner} from '../../../lib/owner-access';
import {hasAdminRole} from '../../../lib/admin-auth-core.mjs';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const prefix='shared-anki/v1/';
export async function GET(request:Request){
 if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in required.'},401);
 if(!env.BUCKET)return json({error:'Shared decks unavailable.'},503);
 try { const decks=[]; let cursor:string|undefined; do { const options={prefix,include:['customMetadata'],cursor}; const page=await env.BUCKET.list(options); for(const obj of page.objects){const m=obj.customMetadata;if(m && /^[a-f0-9]{64}$/.test(obj.key.slice(prefix.length)))decks.push({id:obj.key.slice(prefix.length),name:m.name,bytes:obj.size,cardCount:Number(m.cards),createdAt:m.createdAt});} cursor=page.truncated?page.cursor:undefined; } while(cursor); decks.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); return json({decks}); }catch{return json({error:'Shared decks unavailable.'},503)}
}
export async function POST(request:Request){
 const user=request.headers.get('oai-authenticated-user-id'); if(!user)return json({error:'Sign in required.'},401);
 if(!sameOrigin(request))return json({error:'Invalid origin.'},403);
 if(!env.BUCKET)return json({error:'Shared decks unavailable.'},503);
 try {
  if(!await requestOwner(request)&&!await hasAdminRole(env.BUCKET,user))return json({error:'Admin authorization required.'},403);
  if(Number(request.headers.get('content-length'))>22000000)return json({error:'Deck limit is 20 MiB.'},413);
  const contentType=request.headers.get('content-type')||'';if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))return json({error:'Invalid upload.'},400);
  let form:FormData;try{
   const reader=request.body?.getReader();if(!reader)return json({error:'Invalid upload.'},400);
   const parts:ArrayBuffer[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>22000000){await reader.cancel();return json({error:'Deck limit is 20 MiB.'},413)}parts.push(Uint8Array.from(value).buffer)}
   form=await new Response(new Blob(parts),{headers:{'Content-Type':contentType}}).formData();
  }catch{return json({error:'Invalid upload.'},400)}
  const file=form.get('file'),cards=Number(form.get('cards'));
  if(!(file instanceof File)||file.size<1||file.size>20971520||!/^.{1,240}\.(apkg|colpkg)$/i.test(file.name)||!Number.isSafeInteger(cards)||cards<1||cards>100000)return json({error:'Invalid Anki package.'},400);
  const signature=new Uint8Array(await file.slice(0,4).arrayBuffer());if(signature.length<4||signature[0]!==0x50||signature[1]!==0x4b||!((signature[2]===3&&signature[3]===4)||(signature[2]===5&&signature[3]===6)||(signature[2]===7&&signature[3]===8)))return json({error:'Invalid Anki package.'},400);
  const name=file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,240), bytes=await file.arrayBuffer();
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const existing=await env.BUCKET.head(prefix+id); if(existing){const m=existing.customMetadata;return json({id,name:m?.name||name,bytes:existing.size,cardCount:Number(m?.cards||cards),createdAt:m?.createdAt});}
  const createdAt=new Date().toISOString();await env.BUCKET.put(prefix+id,bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{name,cards:String(cards),createdAt}});
  return json({id,name,bytes:file.size,cardCount:cards,createdAt});
 }catch{return json({error:'Shared decks unavailable.'},503)}
}
