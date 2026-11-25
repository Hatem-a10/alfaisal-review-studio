const DAY=86400000,KEEP_DAYS=90,KEEP_RECENT=3,ACCOUNT_BATCH=12,MAX_OBJECTS=250,MAX_DELETE=10;
function pointer(row){try{const data=JSON.parse(row.snapshot);if(data?.r2Snapshot){const key=data.r2Snapshot;if(typeof key!=='string'||!key.startsWith('progress/'+row.user_id+'/')||!uuid(key.split('/').at(-1)))return null;return {key}}if(data?.app==='alfaisal-review-studio'&&data.version===2&&data.records&&typeof data.records==='object'&&!Array.isArray(data.records))return {key:null};return null}catch{return null}}
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||'');
export function retentionCandidates(row,objects,when){
 const ref=pointer(row);if(!ref||typeof row.user_id!=='string'||!row.user_id||row.user_id.includes('/')||objects.length>MAX_OBJECTS)return [];
 const prefix='progress/'+row.user_id+'/',eligible=objects.filter(x=>typeof x.key==='string'&&x.key.startsWith(prefix)&&uuid(x.key.slice(prefix.length))&&Number.isFinite(Date.parse(x.uploaded))).sort((a,b)=>Date.parse(b.uploaded)-Date.parse(a.uploaded));
 return eligible.slice(KEEP_RECENT).filter(x=>x.key!==ref.key&&Date.parse(x.uploaded)<when-KEEP_DAYS*DAY);
}
export async function reviewProgressRetention(db,bucket,when,{deleteEnabled=false}={}){
 const report={mode:deleteEnabled?'delete-approved':'dry-run',accounts:0,candidates:0,candidateBytes:0,deleted:0,skipped:0,errors:0};if(!db||!bucket)return {...report,unavailable:true};
 const count=Number((await db.prepare('SELECT count(*) AS n FROM study_snapshots').first())?.n||0);if(!count)return report;
 const pages=Math.ceil(count/ACCOUNT_BATCH),page=Math.floor(when/DAY)%pages;
 const {results=[]}=await db.prepare('SELECT user_id,revision,snapshot FROM study_snapshots ORDER BY user_id LIMIT ? OFFSET ?').bind(ACCOUNT_BATCH,page*ACCOUNT_BATCH).all();
 for(const row of results){report.accounts++;try{
  if(!pointer(row)||typeof row.user_id!=='string'||!row.user_id||row.user_id.includes('/')){report.skipped++;continue}
  const listing=await bucket.list({prefix:'progress/'+row.user_id+'/',limit:MAX_OBJECTS});if(listing.truncated){report.skipped++;continue}
  const candidates=retentionCandidates(row,listing.objects,when);report.candidates+=candidates.length;report.candidateBytes+=candidates.reduce((n,x)=>n+(Number(x.size)||0),0);
  if(!deleteEnabled)continue;
  for(const object of candidates){if(report.deleted>=MAX_DELETE)break;
   const current=await db.prepare('SELECT revision,snapshot FROM study_snapshots WHERE user_id=?').bind(row.user_id).first();
   if(!current||current.revision!==row.revision||current.snapshot!==row.snapshot||pointer({...current,user_id:row.user_id})?.key===object.key){report.skipped++;break}
   const latest=await bucket.head(object.key);if(!latest||Date.parse(latest.uploaded)!==Date.parse(object.uploaded)||latest.size!==object.size){report.skipped++;continue}
   await bucket.delete(object.key);report.deleted++;
  }
 }catch{report.errors++}}
 return report;
}
