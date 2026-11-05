import {SITE_ASSETS} from './site-assets-manifest';
import {STUDY_ASSETS} from './study-asset-registry';
export type MaterialRow={id:string;name:string;lectureId:string;mime:string;bytes:number;pageCount:number;createdAt:string};
export const digest=async(b:ArrayBuffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
const base=(user:string,id:string)=>'materials/'+user+'/'+id;
export async function materialOriginal(bucket:R2Bucket,user:string,id:string){
 const own=await bucket.get(base(user,id)+'/original');if(own)return own;
 const alias=await bucket.get(base(user,id)+'/original-alias');if(!alias)return null;
 let v;try{v=await alias.json<{key:string;sha:string;bytes:number}>()}catch{return null}
 if(!/^[a-f0-9]{64}$/.test(v.sha)||!Number.isSafeInteger(v.bytes)||v.bytes<1)return null;
 const allowed=v.key==='site-assets/data/'+v.sha||v.key==='study-assets-v1/'+v.sha||new RegExp('^materials/'+user.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/[\\w-]{1,80}/original$').test(v.key);
 if(!allowed)return null;const obj=await bucket.get(v.key);return obj?.size===v.bytes?obj:null;
}
export async function knownOriginal(bucket:R2Bucket,sha:string,size:number){
 const old=SITE_ASSETS.find(a=>a.sha===sha&&a.size===size);if(old){const key='site-assets/data/'+sha,o=await bucket.head(key);if(o?.size===size)return {key,url:'/api/site-assets/'+old.path,name:old.path.split('/').pop()}}
 const added=STUDY_ASSETS.find(a=>a.sha===sha&&a.size===size);if(added){const key='study-assets-v1/'+sha,o=await bucket.head(key);if(o?.size===size)return {key,url:'/api/study-assets/'+added.id,name:added.id}}
 return null;
}
export async function materialRows(db:D1Database,user:string){const r=await db.prepare("SELECT id,name,lecture_id AS lectureId,mime,bytes,page_count AS pageCount,created_at AS createdAt FROM study_materials WHERE user_id=? AND lecture_id!='ANKI' ORDER BY created_at ASC,id ASC").bind(user).all<MaterialRow>();return r.results}
export async function duplicateMaterial(bucket:R2Bucket,user:string,rows:MaterialRow[],sha:string,size:number){for(const row of rows.filter(r=>r.bytes===size)){const original=await materialOriginal(bucket,user,row.id);if(original&&await digest(await original.arrayBuffer())===sha)return row}return null}
