// Audit 5 A5-299: local-only static academic inventory cost estimator.
// Does not access live R2, recovery archives, student data or delete any blob.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
function list(path){
 const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const assign=code.indexOf('=',code.indexOf('export const ')),start=code.indexOf('[',assign),end=code.lastIndexOf(']');
 if(assign<0||start<0||end<=start)throw Error('Generated source did not contain a JSON array');
 const rows=JSON.parse(code.slice(start,end+1));
 if(!Array.isArray(rows))throw Error('Generated asset manifest must be an array');
 return rows;
}
export function staticRollbackInventory(groups){
 const sizes=new Map(),hashSizes=new Map();let references=0,referencedBytes=0;
 const groupRows={};let sharedHashesAcrossGroups=0;
 for(const [namespace,entries] of Object.entries(groups)){
  if(!/^[a-z0-9/-]{2,64}$/.test(namespace)||!Array.isArray(entries))throw Error('Invalid static inventory group');
  let entriesCount=0,logicalBytes=0,uniqueBytes=0;const seen=new Set();
  for(const row of entries){
   if(!/^[a-f0-9]{64}$/.test(row?.sha)||!Number.isSafeInteger(row?.size)||row.size<1)throw Error('Invalid immutable manifest object');
   if(hashSizes.has(row.sha)&&hashSizes.get(row.sha)!==row.size)throw Error('Conflicting bytes for shared digest');
   if(hashSizes.has(row.sha)&&!seen.has(row.sha))sharedHashesAcrossGroups++;
   hashSizes.set(row.sha,row.size);
   entriesCount++;references++;logicalBytes+=row.size;referencedBytes+=row.size;
   const key=namespace+':'+row.sha;if(!sizes.has(key)){sizes.set(key,row.size);uniqueBytes+=row.size}
   seen.add(row.sha);
  }
  groupRows[namespace]={references:entriesCount,logicalBytes,uniqueBytes,duplicateBytes:logicalBytes-uniqueBytes};
 }
 const uniqueBytes=[...sizes.values()].reduce((a,b)=>a+b,0);
 return {kind:'static-manifest-estimate-not-production-archive',references,referencedBytes,uniqueKeys:sizes.size,uniqueBytes,
  duplicateReferenceBytes:referencedBytes-uniqueBytes,sharedHashesAcrossGroups,groups:groupRows,
  includesPersonalBackups:false,includesProofObjects:false,remoteR2Verified:false};
}
export function readStaticRollbackInventory(){
 return staticRollbackInventory({
  'site-assets/data':list('lib/site-assets-manifest.ts'),
  'publisher-packs/v1':list('lib/publisher-packs-manifest.ts'),
  'study-assets-v1':list('lib/study-asset-registry.ts')
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 process.stdout.write(JSON.stringify(readStaticRollbackInventory())+'\n');
}
