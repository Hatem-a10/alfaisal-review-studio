import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const types={'.gz':'application/gzip','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.svg':'image/svg+xml','.gif':'image/gif','.json':'application/json; charset=utf-8',
 '.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.wasm':'application/wasm'};
const paths=[];
for(const folder of readdirSync('public',{withFileTypes:true}).filter(entry=>entry.isDirectory()&&
 (entry.name.endsWith('-figures')||['anatomy-models','vendor','lab-readings'].includes(entry.name)))){
 for(const entry of readdirSync('public/'+folder.name,{recursive:true,withFileTypes:true})){
  if(!entry.isFile()||!types[path.extname(entry.name)])continue;
  if(folder.name==='anatomy-models'&&!entry.name.endsWith('.glb.gz'))continue;
  paths.push(path.relative('public',path.join(entry.parentPath,entry.name)));
 }
}
for(const name of readdirSync('public')){
 if(/-sources\.json$/.test(name)||['supplemental-objective-questions.json','lesson-expansion-data.json'].includes(name))paths.push(name);
}
const manifest=paths.sort().map(path=>{
 const bytes=readFileSync('public/'+path);
 return {path,sha:createHash('sha256').update(bytes).digest('hex'),size:bytes.length,type:types[path.slice(path.lastIndexOf('.'))]};
});
writeFileSync('lib/private-media-manifest.json',JSON.stringify(manifest)+'\n');
console.log({assets:manifest.length,bytes:manifest.reduce((total,asset)=>total+asset.size,0)});
