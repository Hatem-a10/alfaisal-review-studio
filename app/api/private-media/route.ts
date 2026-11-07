import {env} from 'cloudflare:workers';
import {PRIVATE_MEDIA,hashBytes,manifestHash,mediaKey,mediaPrefix} from '../../../lib/private-media';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const assetsByPath=new Map(PRIVATE_MEDIA.map(asset=>[asset.path,asset]));
const authorized=(request:Request)=>Boolean(request.headers.get('oai-authenticated-user-id'));

export async function GET(request:Request){
 if(!authorized(request))return json({error:'Sign in required.'},401);
 const bucket=env.BUCKET;if(!bucket)return json({error:'Private storage unavailable.'},503);
 const stored=new Map<string,R2Object>();
 let cursor:string|undefined;
 do{
  const page=await bucket.list({prefix:mediaPrefix,include:['customMetadata'],...(cursor?{cursor}:{})});
  for(const object of page.objects)stored.set(object.key,object);
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor);
 const pending=PRIVATE_MEDIA.filter(asset=>{
  const object=stored.get(mediaKey(asset.sha));
  return object?.size!==asset.size||object.customMetadata?.sha!==asset.sha;
 });
 return json({manifestHash:await manifestHash(),verified:PRIVATE_MEDIA.length-pending.length,total:PRIVATE_MEDIA.length,
  cloudBytes:[...stored.values()].reduce((sum,object)=>sum+object.size,0),pending:pending.map(asset=>({path:asset.path,size:asset.size}))});
}

export async function POST(request:Request){
 if(!authorized(request))return json({error:'Sign in required.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 const bucket=env.BUCKET;if(!bucket)return json({error:'Private storage unavailable.'},503);
 if(Number(request.headers.get('content-length'))>12000000)return json({error:'Batch too large.'},413);
 let form;
 try{form=await request.formData();}catch{return json({error:'Invalid migration batch.'},400);}
 const files=[...form.entries()];
 if(!files.length||files.length>20)return json({error:'Invalid file count.'},400);
 let bytesTotal=0;
 const batch=[];
 for(const [path,file] of files){
  const asset=assetsByPath.get(path);
  if(!asset||typeof file==='string'||file.size!==asset.size)return json({error:'Unknown asset or size mismatch.'},400);
  bytesTotal+=file.size;
  if(bytesTotal>11000000)return json({error:'Batch too large.'},413);
  const bytes=await file.arrayBuffer();
  if(await hashBytes(bytes)!==asset.sha)return json({error:'Checksum mismatch: '+path},400);
  batch.push({asset,bytes});
 }
 for(const {asset,bytes} of batch){
  const key=mediaKey(asset.sha);
  const old=await bucket.head(key);
  if(old?.size===asset.size&&old.customMetadata?.sha===asset.sha)continue;
  await bucket.put(key,bytes,{httpMetadata:{contentType:asset.type}});
  const readback=await bucket.get(key);
  if(!readback||await hashBytes(await readback.arrayBuffer())!==asset.sha)return json({error:'Readback verification failed: '+asset.path},503);
  await bucket.put(key,bytes,{httpMetadata:{contentType:asset.type},customMetadata:{sha:asset.sha}});
 }
 return json({saved:batch.length});
}
