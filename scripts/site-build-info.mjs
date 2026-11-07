import {storageBreakdown} from './storage-breakdown.mjs';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,statSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
function files(dir){if(!existsSync(dir))return [];return readdirSync(dir,{withFileTypes:true}).flatMap(d=>{const p=dir+'/'+d.name;return d.isDirectory()?files(p):d.isFile()?[p]:[]})}
export function finishSiteAssets(cleanup={}){const migrated=/export const migrated=true;/.test(readFileSync(root+'lib/site-assets.ts','utf8'));
 if(migrated){const proof=JSON.parse(readFileSync(root+'scripts/site-asset-proof.json','utf8')),source=readFileSync(root+'lib/site-assets-manifest.ts'),manifestHash=createHash('sha256').update(source).digest('hex');if(proof.manifestHash!==manifestHash||proof.verifiedCount!==660)throw Error('Site assets need cloud verification before removing bundled copies.');for(const name of ['materials','study_material'])rmSync(root+'dist/client/'+name,{recursive:true,force:true})}
 const input=[...files(root+'app'),...files(root+'worker'),...files(root+'lib').filter(p=>!p.endsWith('learning-payload.ts')),...files(root+'public').filter(p=>!p.includes('/materials/')&&!p.includes('/study_material/')&&!p.includes('/vendor/')),...files(root+'scripts').filter(p=>p.endsWith('.mjs'))].sort(),hash=createHash('sha256');for(const p of input){hash.update(p.slice(root.length));hash.update(readFileSync(p))}hash.update(String(migrated));const fingerprint=hash.digest('hex');const output=root+'dist/client/site-build-info.json',builtAt=new Date().toISOString();const temp=mkdtempSync(join(tmpdir(),'review-studio-measure-')),archive=join(temp,'build.tar');
 const entries=files(root+'dist').filter(p=>p!==output).map(p=>({path:p.slice((root+'dist/').length),bytes:statSync(p).size}));
 const breakdown=storageBreakdown(entries),fileBytes=entries.reduce((sum,row)=>sum+row.bytes,0);
 const info={fingerprint,builtAt,migrated,measuredExpandedBytes:268435456,breakdown:{...breakdown,metadataBytes:0,
  removedBytes:cleanup.removedBytes||0,removedFiles:cleanup.removedFiles||0}};
 try{
  for(let attempt=0;attempt<5;attempt++){
   writeFileSync(output,JSON.stringify(info));
   const run=spawnSync('tar',['-cf',archive,'dist'],{cwd:root,stdio:'ignore'});
   if(run.error||run.status!==0)throw Error('Could not measure the deployment package.');
   const measured=statSync(archive).size;
   if(measured===info.measuredExpandedBytes)return;
   info.measuredExpandedBytes=measured;
   info.breakdown.metadataBytes=measured-fileBytes;
  }
  throw Error('Deployment package measurement did not converge.');
 }finally{rmSync(temp,{recursive:true,force:true})}
}
