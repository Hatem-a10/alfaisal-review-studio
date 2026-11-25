const DAY=86400000,BATCH=20,MAX_HASH_BYTES=12000000,MAX_BATCH_BYTES=50000000;
export function selectIntegrityBatch(assets,when,batch=BATCH){
 const items=[...new Map(assets.filter(r=>/^[0-9a-f]{64}$/.test(r.sha)&&Number.isSafeInteger(r.size)&&r.size>0).map(r=>[r.sha,r])).values()].sort((a,b)=>a.sha.localeCompare(b.sha));
 if(!items.length)return [];
 const pages=Math.ceil(items.length/batch),page=((Math.floor(when/DAY)%pages)+pages)%pages;
 return items.slice(page*batch,(page+1)*batch);
}
export async function checkIntegrityBatch(bucket,assets,when){
 const rows=selectIntegrityBatch(assets,when),report={checkedAt:new Date(when).toISOString(),sample:rows.length,verified:0,headOnly:0,missing:0,sizeMismatch:0,hashMismatch:0,errors:0,bytesHashed:0,issues:[]};
 const issue=(row,kind)=>{report[kind]++;report.issues.push({sha:row.sha,kind})};
 for(const row of rows){try{
  const key='site-assets/data/'+row.sha,head=await bucket.head(key);
  if(!head){issue(row,'missing');continue}if(head.size!==row.size){issue(row,'sizeMismatch');continue}
  if(row.size>MAX_HASH_BYTES||report.bytesHashed+row.size>MAX_BATCH_BYTES){report.headOnly++;continue}
  const obj=await bucket.get(key);if(!obj){issue(row,'missing');continue}if(obj.size!==row.size){await obj.body?.cancel();issue(row,'sizeMismatch');continue}
  const bytes=await obj.arrayBuffer();report.bytesHashed+=bytes.byteLength;
  if(bytes.byteLength!==row.size){issue(row,'sizeMismatch');continue}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==row.sha){issue(row,'hashMismatch');continue}report.verified++;
 }catch{issue(row,'errors')}}
 return report;
}
