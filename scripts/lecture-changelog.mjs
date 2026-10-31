import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFileSync(root+name,'utf8');
const {assembledLearning}=await import('./assembled-learning.mjs');
const {learning,teaching}=assembledLearning();
const manifestText=read('lib/site-assets-manifest.ts');
const manifest=JSON.parse(manifestText.split('export const SITE_ASSETS = ')[1].replace(/\s+as const;?\s*$/, ''));
const assets=new Map(manifest.map(x=>[x.path,x.sha]));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16);
const path=root+'public/lecture-changelog.json';
const old=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
const snapshot={};
for(const lesson of learning.lessons){
 const guide=teaching.guides?.[lesson.id]||null;
 const ids=new Set();
 function refs(v){if(!v||typeof v!=='object')return;if(typeof v.source==='string')ids.add(v.source);for(const x of Object.values(v))refs(x)}
 refs(lesson);refs(guide);
 const sources=(learning.sources||[]).filter(s=>ids.has(s.id)).sort((a,b)=>a.id.localeCompare(b.id));
 const materialHashes={};
 function links(v){if(typeof v==='string'){const match=v.match(/(?:\/api\/site-assets\/|\/)(materials\/[^?#\s]+|study_material\/[^?#\s]+)/);if(match&&assets.has(match[1]))materialHashes[match[1]]=assets.get(match[1]);return}if(v&&typeof v==='object')for(const x of Object.values(v))links(x)}
 links(sources);
 const questions=Object.fromEntries(learning.questions.filter(q=>q.lectureIds?.includes(lesson.id)).map(q=>[q.id,digest(q)]).sort(([a],[b])=>a.localeCompare(b)));
 snapshot[lesson.id]={lesson:digest(lesson),guide:digest(guide),sources:digest({sources,materialHashes}),questions};
}
let entries=old?.entries||[];
if(old?.snapshot){const changes=[];for(const [id,current] of Object.entries(snapshot)){const prev=old.snapshot[id];if(!prev){changes.push({id,details:['Lesson added']});continue}const details=[];if(current.lesson!==prev.lesson||current.guide!==prev.guide)details.push('Lesson content updated');if(current.sources!==prev.sources)details.push('Linked source material updated');const a=prev.questions||{},b=current.questions||{};const added=Object.keys(b).filter(k=>!a[k]).length,removed=Object.keys(a).filter(k=>!b[k]).length,edited=Object.keys(b).filter(k=>a[k]&&a[k]!==b[k]).length;if(added)details.push(`${added} question${added===1?'':'s'} added`);if(edited)details.push(`${edited} question${edited===1?'':'s'} updated`);if(removed)details.push(`${removed} question${removed===1?'':'s'} removed`);if(details.length)changes.push({id,details})}if(changes.length)entries=[{at:new Date().toISOString(),changes},...entries].slice(0,50)}
const result={version:1,baselineAt:old?.baselineAt||new Date().toISOString(),snapshot,entries};
if(!old||JSON.stringify(result)!==JSON.stringify(old))writeFileSync(path,JSON.stringify(result));
