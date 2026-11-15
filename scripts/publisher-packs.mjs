import {readFileSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Never omit a bundled asset until its exact existing R2 copy was verified.
export function prunePacks(root){
 const match=readFileSync(path.join(root,'lib/publisher-packs-manifest.ts'),'utf8').match(/=([\s\S]*);/),packs=match?JSON.parse(match[1]):[];
 const proof=JSON.parse(readFileSync(path.join(root,'scripts/publisher-packs-proof.json'),'utf8'));
 for(const asset of packs){
  if(!proof.verified.some(a=>a.path===asset.path&&a.sha===asset.sha&&a.size===asset.size))throw Error('Missing verified R2 copy: '+asset.path);
  const file=path.join(root,'dist/client',asset.path);if(!existsSync(file))continue;
  const data=readFileSync(file);
  if(data.length!==asset.size||hash(data)!==asset.sha)throw Error('Publisher asset changed; verify its new R2 copy before pruning: '+asset.path);
  rmSync(file);
 }
 return packs.reduce((n,p)=>n+p.size,0);
}
