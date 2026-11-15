import {checkStartupBudget} from './performance-budget.mjs';
import {deferSourceReading} from './source-demand.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,rmSync,statSync} from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {transformSync} from 'esbuild';
// Preserve independent entry points and dynamically requested scripts.
function pruneBundledCopies(dir,names,code){
 const candidates=new Set(names);
 const surfaces=readdirSync(dir,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()&&/\.(?:html|mjs|js|css)$/.test(entry.name))
  .map(entry=>path.join(entry.parentPath,entry.name)).filter(file=>!candidates.has(path.relative(dir,file)));
 const remaining=surfaces.map(file=>readFileSync(file,'utf8')).join('\n')+'\n'+code;
 let removedBytes=0,removedFiles=0;
 for(const name of candidates){
  const file=path.join(dir,name);
  const literal=name.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
  if(!existsSync(file)||new RegExp('(?:^|[^\\w.-])'+literal+'(?=$|[^\\w.-])').test(remaining))continue;
  removedBytes+=statSync(file).size;removedFiles++;rmSync(file);
 }
 return {removedBytes,removedFiles};
}
// Compile the classic global-script application in its declared dependency order.
export function optimizeClientScripts(root){const dir=path.join(root,'dist/client'),index=path.join(dir,'index.html');let html=readFileSync(index,'utf8');html=html.replace(/<script id="deviceBootstrap">[\s\S]*?<\/script>/,()=>'<script id="deviceBootstrap">'+readFileSync(path.join(root,'public/device-storage.js'),'utf8')+'</script>');const tags=[...html.matchAll(/<script\s+type="application\/x-review-studio"\s+data-src="([^"]+)"\s*><\/script>/g)];if(tags.length<2)return {requestsBefore:tags.length,requestsAfter:tags.length};const labPath=path.join(root,'public/lab-curriculum.json'),labSources=existsSync(labPath)?JSON.parse(readFileSync(labPath,'utf8')).sources.map(s=>({...s,pages:s.readingURL?JSON.parse(readFileSync(path.join(root,'public',s.readingURL),'utf8')):s.pages})):[];const names=[];const sources=tags.map(m=>{const url=m[1].split('?')[0],name=url==='/api/lesson-data'?'learning-data.js':url;names.push(name);if(name.startsWith('/'))throw Error('Unexpected remote startup script: '+name);const file=path.resolve(root,'public',name);if(!file.startsWith(path.join(root,'public')+path.sep))throw Error('Startup script outside public');const source=readFileSync(file,'utf8');return name==='learning-data.js'?deferSourceReading(source,dir,labSources):source});const code=transformSync(sources.join('\n;\n'),{loader:'js',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,charset:"utf8",target:'safari16.4',legalComments:'none'}).code,hash=createHash('sha256').update(code).digest('hex').slice(0,16),url='_studio/client-'+hash+'.js';const metrics=checkStartupBudget(code);mkdirSync(path.join(dir,'_studio'),{recursive:true});writeFileSync(path.join(dir,'startup-budget.json'),JSON.stringify(metrics));writeFileSync(path.join(dir,url),code);for(const [i,m]of [...tags.entries()].reverse())html=html.slice(0,m.index)+(i===0?'<script type="application/x-review-studio" data-src="'+url+'"></script>':'')+html.slice(m.index+m[0].length);html=html.replace(/<link rel="preload" as="script" href="\/api\/lesson-data\?v=\d+">/,'');writeFileSync(index,html);const pruned=pruneBundledCopies(dir,names,code);const bootstrapFile=path.join(dir,'device-storage.js');if(existsSync(bootstrapFile)){pruned.removedBytes+=statSync(bootstrapFile).size;pruned.removedFiles++;rmSync(bootstrapFile)}return {...pruned,requestsBefore:tags.length,requestsAfter:1,bytesBefore:sources.reduce((n,s)=>n+Buffer.byteLength(s),0),bytesAfter:Buffer.byteLength(code)}}
