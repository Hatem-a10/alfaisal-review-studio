import {checkStartupBudget,measureEntry} from './performance-budget.mjs';
import {deferSourceReading} from './source-demand.mjs';
import {splitCourseScripts,preludeSource} from './course-packs.mjs';
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
// Preload the full static import graph of every modulepreloaded runtime so dependencies download in parallel
// instead of one import level per round trip. Dynamic import() targets stay lazy.
export function expandModulePreloads(dir,html){
 const seen=new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m=>m[1])),queue=[...seen],extra=[];
 while(queue.length){
  const href=queue.shift(),file=path.join(dir,href.replace(/^\//,'').replace(/[?#].*$/,''));
  if(!existsSync(file))continue;
  const code=readFileSync(file,'utf8');
  for(const m of code.matchAll(/(?:^|[;\s}])(?:import\s*(?:[\w$*{}\s,]+?\s*from\s*)?|export\s*[\w$*{}\s,]+?\s*from\s*)(["'])(\.{1,2}\/[^"']+)\1/g)){
   const next=new URL(m[2],'https://x'+href).pathname+new URL(m[2],'https://x'+href).search;
   if(seen.has(next))continue;seen.add(next);queue.push(next);extra.push(next);
  }
 }
 return extra.length?html.replace('</head>',extra.map(h=>'<link rel="modulepreload" href="'+h+'">').join('')+'</head>'):html;
}
// Compile the classic global-script application in its declared dependency order.
export function optimizeClientScripts(root){const dir=path.join(root,'dist/client'),index=path.join(dir,'index.html');let html=readFileSync(index,'utf8');html=html.replace(/<script id="deviceBootstrap">[\s\S]*?<\/script>/,()=>'<script id="deviceBootstrap">'+readFileSync(path.join(root,'public/device-storage.js'),'utf8')+'</script>');const tags=[...html.matchAll(/<script\s+type="application\/x-review-studio"\s+data-src="([^"]+)"\s*><\/script>/g)];if(tags.length<2)return {requestsBefore:tags.length,requestsAfter:tags.length};const labPath=path.join(root,'public/lab-curriculum.json'),labSources=existsSync(labPath)?JSON.parse(readFileSync(labPath,'utf8')).sources.map(s=>({...s,pages:s.readingURL?JSON.parse(readFileSync(path.join(root,'public',s.readingURL),'utf8')):s.pages})):[];const names=[];const sources=tags.map(m=>{const url=m[1].split('?')[0],name=url==='/api/lesson-data'?'learning-data.js':url;names.push(name);if(name.startsWith('/'))throw Error('Unexpected remote startup script: '+name);const file=path.resolve(root,'public',name);if(!file.startsWith(path.join(root,'public')+path.sep))throw Error('Startup script outside public');const source=readFileSync(file,'utf8');return name==='learning-data.js'?deferSourceReading(source,dir,labSources):source});const minify=src=>transformSync(src,{loader:'js',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,charset:"utf8",target:'safari16.4',legalComments:'none'}).code;const split=process.env.REVIEW_COURSE_PACKS==='off'?{coreSources:sources,packSources:{}}:splitCourseScripts(names,sources),packURLs={},packCodes=[],featureSizes={};mkdirSync(path.join(dir,'_studio'),{recursive:true});for(const [course,source] of Object.entries(split.packSources)){const packCode=minify(source),packURL='_studio/course-'+course+'-'+createHash('sha256').update(packCode).digest('hex').slice(0,16)+'.js';writeFileSync(path.join(dir,packURL),packCode);packURLs[course]='/'+packURL;packCodes.push(packCode);featureSizes['course:'+course]={file:packURL,...measureEntry(packCode)}}const code=minify(preludeSource(packURLs)+'\n;\n'+split.coreSources.join('\n;\n')),hash=createHash('sha256').update(code).digest('hex').slice(0,16),url='_studio/client-'+hash+'.js';const metrics=checkStartupBudget(code);featureSizes.startup={file:url,...measureEntry(code)};console.log(JSON.stringify({label:'A5-271 compressed feature size report',brotliQuality:5,entries:featureSizes}));mkdirSync(path.join(dir,'_studio'),{recursive:true});writeFileSync(path.join(dir,'startup-budget.json'),JSON.stringify(metrics));writeFileSync(path.join(dir,url),code);for(const [i,m]of [...tags.entries()].reverse())html=html.slice(0,m.index)+(i===0?'<script type="application/x-review-studio" data-src="'+url+'"></script>':'')+html.slice(m.index+m[0].length);html=html.replace(/<link rel="preload" as="script" href="\/api\/lesson-data\?v=\d+">/,'').replace('</head>','<link rel="preload" as="script" href="/'+url+'"><link rel="modulepreload" href="/phase1-runtime.mjs?v=1497"><link rel="modulepreload" href="/phase2-runtime.mjs?v=1498"><link rel="modulepreload" href="/phase3-runtime.mjs"><link rel="modulepreload" href="/course-workspace.mjs"></head>');html=expandModulePreloads(dir,html);writeFileSync(index,html);const pruned=pruneBundledCopies(dir,names,code+'\n'+packCodes.join('\n'));const bootstrapFile=path.join(dir,'device-storage.js');if(existsSync(bootstrapFile)){pruned.removedBytes+=statSync(bootstrapFile).size;pruned.removedFiles++;rmSync(bootstrapFile)}return {...pruned,featureSizes,requestsBefore:tags.length,requestsAfter:1,bytesBefore:sources.reduce((n,s)=>n+Buffer.byteLength(s),0),bytesAfter:Buffer.byteLength(code)}}
