import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {appendFile,mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const wrangler=promisify(execFile),bucket='review-studio-production';
const [configPath,inventoryPath,inputPath,receiptPath]=process.argv.slice(2);
if(!receiptPath||process.argv.length!==6)throw Error('Usage: transfer-production-assets.mjs <config> <inventory> <payload root> <receipt>');
const config=JSON.parse(await readFile(configPath));
if(config.name!==bucket||config.vars?.REVIEW_STUDIO_DEPLOYMENT!=='production'||
 config.r2_buckets?.length!==1||config.r2_buckets[0].bucket_name!==bucket||
 config.workers_dev!==false||config.preview_urls!==false||config.routes?.length)throw Error('Wrong production binding');
const {verifiedFrom,objects}=JSON.parse(await readFile(inventoryPath));
if(verifiedFrom!=='source'||!Array.isArray(objects)||!objects.length)throw Error('Verified source inventory required');
const allowed=/^(site-assets\/data|study-assets-v1|publisher-packs\/v1)\/([a-f0-9]{64})$/;
const keys=new Set();
for(const row of objects){
 if(allowed.exec(row.key)?.[2]!==row.sha || !Number.isSafeInteger(row.size)||row.size<1||keys.has(row.key))throw Error('Invalid inventory');
 keys.add(row.key);
}
const receipt=resolve(receiptPath);
const existing=await readFile(receipt,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
const done=new Set(existing.split('\n').filter(Boolean).map(line=>JSON.parse(line).key));
const temp=await mkdtemp(join(tmpdir(),'review-studio-r2-'));
const sha256=async path=>{
 const digest=createHash('sha256');
 let bytes=0;
 for await(const chunk of createReadStream(path)){digest.update(chunk);bytes+=chunk.length;}
 return {sha:digest.digest('hex'),bytes};
};
async function object(command,key,path,type){
 const flags=['node_modules/wrangler/bin/wrangler.js','r2','object',command,bucket+'/'+key,'--config',configPath,'--remote','--file',path];
 if(type)flags.push('--content-type',type);
 for(let attempt=0;;attempt++){
  try {await wrangler(process.execPath,flags,{timeout:120000});return true;}
  catch(error){
   const message=String(error.stderr);
   if(command==='get'&&/not found|does not exist|\[code: 10007\]/i.test(message))return false;
   if(attempt<4&&/429|50[0234]|network|timeout|failed to fetch/i.test(message)){
    await new Promise(resolve=>setTimeout(resolve,(attempt+1)*3000));continue;
   }
   throw Error(`R2 ${command} failed for ${key}`);
  }
 }
}
const queue=objects.filter(row=>!done.has(row.key));
let cursor=0,verified=done.size,failed=0;
async function lane(number){
 const readback=join(temp,'readback-'+number);
 const proof=join(temp,'proof-'+number);
 for(;;){
  const row=queue[cursor++];if(!row)return;
  try{
   const input=resolve(inputPath,row.key);
   if((await stat(input)).size!==row.size||(await sha256(input)).sha!==row.sha)throw Error('Local checksum mismatch');
   if(!await object('get',row.key,readback)){
    await object('put',row.key,input,row.contentType);
    if(!await object('get',row.key,readback))throw Error('Destination missing after upload');
   }
   let actual=await sha256(readback);
   for(let retry=0;retry<3&&(actual.sha!==row.sha||actual.bytes!==row.size);retry++){
    await rm(readback,{force:true});
    await new Promise(resolve=>setTimeout(resolve,(retry+1)*250));
    if(!await object('get',row.key,readback))throw Error('Destination missing on checksum retry');
    actual=await sha256(readback);
   }
   if(actual.sha!==row.sha||actual.bytes!==row.size)throw Error('Remote checksum mismatch');
   if(row.category==='curriculum'){
    await writeFile(proof,JSON.stringify({sha:row.sha,size:row.size,verifiedAt:new Date().toISOString()}));
    await object('put','site-assets/verified/'+row.sha,proof,'application/json');
   }
   await appendFile(receipt,JSON.stringify({key:row.key,sha:row.sha,bytes:row.size})+'\n',{mode:0o600});
   verified++;
   if(verified%25===0||verified===objects.length)console.log(`Verified ${verified}/${objects.length}`);
  }catch(error){failed++;console.error(row.key+': '+error.message);}
  finally{await rm(readback,{force:true});}
  if(failed>=8)return;
 }
}
try{await Promise.all(Array.from({length:12},(_,i)=>lane(i)));}
finally{await rm(temp,{force:true,recursive:true});}
if(failed||verified!==objects.length)throw Error(`Transfer incomplete: ${verified} verified, ${failed} failures. Re-run to resume.`);
