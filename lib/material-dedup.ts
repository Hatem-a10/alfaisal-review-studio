import {SITE_ASSETS} from './site-assets-manifest';
import {STUDY_ASSETS} from './study-asset-registry';
export type MaterialRow={id:string;name:string;lectureId:string;mime:string;bytes:number;pageCount:number;createdAt:string};
export const digest=async(b:ArrayBuffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
const base=(user:string,id:string)=>'materials/'+user+'/'+id;
const HASH=/^[a-f0-9]{64}$/;
const MAX_ORIGINAL=25_000_000;
function registeredKey(key:string,sha:string,size:number){
 return key==='site-assets/data/'+sha&&SITE_ASSETS.some(a=>a.sha===sha&&a.size===size)||
 key==='study-assets-v1/'+sha&&STUDY_ASSETS.some(a=>a.sha===sha&&a.size===size);
}
export async function materialOriginal(bucket:R2Bucket,user:string,id:string){
 const own=await bucket.get(base(user,id)+'/original');if(own)return own;
 const alias=await bucket.get(base(user,id)+'/original-alias');if(!alias||alias.size>2048)return null;
 let v;try{v=await alias.json<{key:string;sha:string;bytes:number}>()}catch{return null}
 if(!v||typeof v!=='object'||typeof v.key!=='string'||typeof v.sha!=='string'||!HASH.test(v.sha)||!Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>MAX_ORIGINAL)return null;
 const canonical=v.key===base(user,'content-'+v.sha)+'/original',prefix='materials/'+user+'/';
 const legacy=v.key.startsWith(prefix)&&/^[\w-]{1,80}\/original$/.test(v.key.slice(prefix.length))&&!v.key.startsWith(prefix+'content-');
 if(!canonical&&!registeredKey(v.key,v.sha,v.bytes)&&!legacy)return null;
 const obj=await bucket.get(v.key);if(!obj||obj.size!==v.bytes)return null;
 // Verify aliases to legacy mutable document keys; generated content-addressed
 // objects are verified when installed and are immutable.
 if(legacy&&!canonical){
  const bytes=await obj.arrayBuffer();if(bytes.byteLength!==v.bytes||await digest(bytes)!==v.sha)return null;
  return {size:bytes.byteLength,body:bytes,arrayBuffer:async()=>bytes};
 }
 return obj;
}
export async function knownOriginal(bucket:R2Bucket,sha:string,size:number){
 if(!HASH.test(sha)||!Number.isSafeInteger(size)||size<1||size>MAX_ORIGINAL)return null;
 const old=SITE_ASSETS.find(a=>a.sha===sha&&a.size===size);if(old){const key='site-assets/data/'+sha,o=await bucket.get(key);if(o?.size===size&&await digest(await o.arrayBuffer())===sha)return {key,url:'/api/site-assets/'+old.path,name:old.path.split('/').pop()}}
 const added=STUDY_ASSETS.find(a=>a.sha===sha&&a.size===size);if(added){const key='study-assets-v1/'+sha,o=await bucket.get(key);if(o?.size===size&&await digest(await o.arrayBuffer())===sha)return {key,url:'/api/study-assets/'+added.id,name:added.id}}
 return null;
}
export async function materialRows(db:D1Database,user:string){const r=await db.prepare("SELECT id,name,lecture_id AS lectureId,mime,bytes,page_count AS pageCount,created_at AS createdAt FROM study_materials WHERE user_id=? AND lecture_id!='ANKI' ORDER BY created_at ASC,id ASC").bind(user).all<MaterialRow>();return r.results}
export async function duplicateMaterial(bucket:R2Bucket,user:string,rows:MaterialRow[],sha:string,size:number){for(const row of rows.filter(r=>r.bytes===size)){const head=await bucket.head(base(user,row.id)+'/original');if(head?.size===size&&head.customMetadata?.sha256===sha)return row;const original=await materialOriginal(bucket,user,row.id);if(original&&await digest(await original.arrayBuffer())===sha)return row}return null}
