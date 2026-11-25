import {SITE_ASSETS} from './site-assets-manifest';
import RENAL_MATERIALS from '../public/renal-materials.json';
import ACTIVE_BOOKLETS from './active-booklet-assets.json';
import RENAL_BOOKLET_ASSET from './renal-booklet-asset.json';
import MOL_STUDY_ASSETS from '../public/mol-study-assets.json';
import RENAL_ASSESSMENT_ASSETS from './renal-assessment-assets.json';
const byPath=new Map<string,{path:string,size:number,sha:string}>([...SITE_ASSETS,...ACTIVE_BOOKLETS,...RENAL_MATERIALS,...RENAL_ASSESSMENT_ASSETS,RENAL_BOOKLET_ASSET,MOL_STUDY_ASSETS.booklet,MOL_STUDY_ASSETS.assessments,...MOL_STUDY_ASSETS.sources].map(x=>[x.path,x]));
export {SITE_ASSETS};
export function integrityAssets(){return [...new Map([...byPath.values()].map(asset=>[asset.sha,asset])).values()]}
export function assetFor(path:string){return byPath.get(path)}
export function dataKey(sha:string){return 'site-assets/data/'+sha}
export function proofKey(sha:string){return 'site-assets/verified/'+sha}
export const migrated=true;
const STATIC_CONTENT_TYPES:Readonly<Record<string,string>>=Object.freeze({pdf:'application/pdf',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',m4a:'audio/mp4',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',json:'application/json'});
export function contentType(path:string){const e=path.slice(path.lastIndexOf('.')+1).toLowerCase();return STATIC_CONTENT_TYPES[e]||'application/octet-stream'}
export async function serveAsset(request:Request,bucket:R2Bucket,path:string,headOnly=false){
 const asset=assetFor(path),error=(message:string,status:number)=>new Response(message,{status,headers:{'Cache-Control':'no-store'}});if(!asset)return error('Not found',404);
 const size=asset.size,tag='"'+asset.sha+'"',ifRange=request.headers.get('if-range'),range=!headOnly&&(!ifRange||ifRange===tag)?request.headers.get('range'):null;
 const unsatisfiable=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`,'Cache-Control':'no-store'}});
 let start=0,end=size-1,status=200;
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return unsatisfiable();
  if(!m[1]){const n=Number(m[2]);if(!Number.isSafeInteger(n)||n<=0)return unsatisfiable();start=Math.max(0,size-n)}
  else{start=Number(m[1]);if(m[2]){const n=Number(m[2]);if(!Number.isSafeInteger(n))return unsatisfiable();end=Math.min(size-1,n)}}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return unsatisfiable();status=206
 }
 const headers=new Headers({'Content-Type':contentType(path),'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Length':String(end-start+1),'ETag':tag,'Content-Disposition':(/\.(?:pptx?|docx)$/i.test(path)?'attachment':'inline')+`; filename*=UTF-8''${encodeURIComponent(path.split('/').pop()||'material')}`});
 try{
  // A5-236: a real range GET returns the authoritative object size itself; do not HEAD first.
  if(headOnly||request.headers.get('if-none-match')===tag){const head=await bucket.head(dataKey(asset.sha));if(!head)return error('Not found',404);if(head.size!==size)return error('Asset integrity check failed',503)}
  if(request.headers.get('if-none-match')===tag){headers.delete('Content-Length');return new Response(null,{status:304,headers})}
  if(status===206)headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  if(headOnly)return new Response(null,{status,headers});
  const obj=await bucket.get(dataKey(asset.sha),status===206?{range:{offset:start,length:end-start+1}}:undefined);
  if(!obj)return error('Not found',404);
  if(obj.size!==size)return error('Asset integrity check failed',503);
  return new Response(obj.body,{status,headers})
 }catch{return error('Asset storage unavailable; retry.',503)}
}
