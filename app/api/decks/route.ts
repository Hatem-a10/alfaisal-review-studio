import {env} from 'cloudflare:workers';
import {fileDigest,hasZipHeader,reservePersonalUpload} from '../../../lib/personal-upload';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to view decks.'},401);if(!env.DB)return json({error:'Cloud deck storage unavailable.'},503);const rows=await env.DB.prepare("SELECT id,name,bytes,page_count AS cardCount,created_at AS createdAt FROM study_materials WHERE user_id=? AND lecture_id='ANKI' ORDER BY created_at DESC").bind(user).all();return json({decks:rows.results})}
export async function POST(request:Request){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in to save decks.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 if(!env.DB||!env.BUCKET)return json({error:'Cloud deck storage unavailable.'},503);
 if(Number(request.headers.get('content-length'))>53000000)return json({error:'Deck limit is 50 MB. Export subdecks for larger collections.'},413);
 let form;try{form=await request.formData()}catch{return json({error:'Invalid deck upload.'},400)}
 const file=form.get('file'),hash=String(form.get('hash')||''),cards=Number(form.get('cards'));
 if(!(file instanceof File)||!/^.{1,240}\.(apkg|colpkg)$/i.test(file.name)||file.size<1||file.size>50000000||!/^[a-f0-9]{64}$/.test(hash)||!Number.isSafeInteger(cards)||cards<1||cards>100000)return json({error:'Invalid Anki package.'},400);
 if(!await hasZipHeader(file)||await fileDigest(file)!==hash)return json({error:'The Anki package is invalid or its checksum did not match. Export and import it again.'},400);
 const scopedHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user+':'+hash)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 const id='anki-'+scopedHash,key='materials/'+user+'/'+id+'/original',at=new Date().toISOString();
 const find=()=>env.DB!.prepare("SELECT id,name,bytes,page_count AS cardCount,created_at AS createdAt FROM study_materials WHERE user_id=? AND id=? AND lecture_id='ANKI'").bind(user,id).first<{id:string;name:string;bytes:number;cardCount:number;createdAt:string}>();
 let row=await find();
 if(!row){
  const reserved=await reservePersonalUpload(env.DB,{id,user,name:file.name.slice(0,250),lectureId:'ANKI',mime:'application/octet-stream',bytes:file.size,pageCount:cards,createdAt:at});
  row=reserved?{id,name:file.name.slice(0,250),bytes:file.size,cardCount:cards,createdAt:at}:await find();
  if(!row)return json({error:'Your personal cloud storage is full (500 MB). Delete unused cloud decks before uploading more.'},413);
 }
 if(row.bytes!==file.size)return json({error:'The stored deck metadata does not match this package. Remove the old cloud deck and retry.'},409);
 // Only verified bytes for this account and hash may reach this deterministic key.
 // Retain the reservation on an uncertain write: retrying this package safely repairs it.
 try{await env.BUCKET.put(key,file.stream(),{httpMetadata:{contentType:'application/octet-stream'}})}
 catch{return json({error:'Cloud deck upload did not finish. Your local deck is retained; retry saving it to cloud.'},503)}
 return json(row);
}
