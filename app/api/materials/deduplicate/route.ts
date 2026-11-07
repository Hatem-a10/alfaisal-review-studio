import {requireAdmin} from '../../../../lib/admin-auth';
import {env} from 'cloudflare:workers';
import {digest,knownOriginal,materialRows} from '../../../../lib/material-dedup';
export async function POST(request:Request){
 const denial=await requireAdmin(request);if(denial)return denial;

 const user=request.headers.get('oai-authenticated-user-id'),json=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{'Cache-Control':'no-store'}});
 if(!user)return json({error:'Sign in required'},401);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
 if(!env.DB||!env.BUCKET)return json({error:'Storage unavailable'},503);
 const rows=await materialRows(env.DB,user),body=await request.json<{offset?:number}>().catch(()=>({offset:0})),start=Number(body?.offset??0);if(!Number.isSafeInteger(start)||start<0)return json({error:'Invalid offset'},400);
 let reclaimed=0,duplicates=0;const checked=new Map<string,string>();
 // Process bounded batches; canonical content keys are independent of document IDs.
 for(const row of rows.slice(start,start+8)){
  const prefix='materials/'+user+'/'+row.id,original=await env.BUCKET.get(prefix+'/original');if(!original)continue;
  const bytes=await original.arrayBuffer(),sha=await digest(bytes),known=await knownOriginal(env.BUCKET,sha,bytes.byteLength),canonical=known?.key||'materials/'+user+'/content-'+sha+'/original';
  const head=await env.BUCKET.head(canonical);if(!head)await env.BUCKET.put(canonical,bytes,{httpMetadata:{contentType:row.mime}});
  const verify=await env.BUCKET.get(canonical);if(!verify||await digest(await verify.arrayBuffer())!==sha)throw Error('Canonical copy verification failed');
  await env.BUCKET.put(prefix+'/original-alias',JSON.stringify({key:canonical,sha,bytes:bytes.byteLength}),{httpMetadata:{contentType:'application/json'}});
  // Alias readback precedes removing a redundant copy. No source ID, extraction or progress is removed.
  const alias=await env.BUCKET.get(prefix+'/original-alias');if(!alias)throw Error('Alias verification failed');
  const stored=await alias.json<{key:string;sha:string;bytes:number}>();if(stored.key!==canonical||stored.sha!==sha||stored.bytes!==bytes.byteLength)throw Error('Alias verification failed');
  await env.BUCKET.delete(prefix+'/original');
  if(known||head||checked.has(sha)){reclaimed+=bytes.byteLength;duplicates++}checked.set(sha,canonical);
 }
 const next=Math.min(rows.length,start+8);return json({processed:next,total:rows.length,next:next<rows.length?next:null,duplicates,reclaimed,preserved:'All document IDs, extracted text and source links retained. Originals resolve to a verified canonical copy.'});
}
