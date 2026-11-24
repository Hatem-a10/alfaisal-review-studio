import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Audit 5 register has exactly 300 distinct candidate IDs and consistent statuses',()=>{
 const src=read('docs/audits/AUDIT-5-REGISTER.md');
 const rows=[...src.matchAll(/^\| (A5-\d{3}) \| ([^|\n]+) \| ([^|\n]+) \|$/gm)];
 assert.equal(rows.length,300);assert.equal(new Set(rows.map(x=>x[1])).size,300);
 const counts={merged:0,existing:0,rejected:0,submitted:0,unassessed:0};
 for(const row of rows){
  const status=row[3].trim(),key=status.startsWith('Merged')?'merged':status.startsWith('Existing')?'existing':status.startsWith('Rejected')?'rejected':status.startsWith('Submitted')?'submitted':status==='Unassessed'?'unassessed':null;
  assert.ok(key,'Unsupported status for '+row[1]);counts[key]++;
 }
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),300);
 assert.ok(counts.merged>=122);
});
test('A5-039 compositor-first CSS keyframes and A5-214 no duplicate keyframe identifiers',()=>{
 const css=readdirSync(new URL('../public/',import.meta.url)).filter(n=>n.endsWith('.css'));
 const names=[];
 for(const name of css)for(const match of read('public/'+name).matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g))names.push([match[1],name]);
 assert.ok(names.length>=4);
 const counts=new Map();for(const [name] of names)counts.set(name,(counts.get(name)||0)+1);
 assert.deepEqual([...counts].filter(([,count])=>count>1),[]);
 const files=[read('public/redesign.css'),read('public/phase3-ui.css')].join('\n');
 assert.match(files,/@keyframes\s+[^\s{]+\s*\{from\{opacity:/);
 assert.match(files,/transform:/);
 console.log(JSON.stringify({label:'A5-214 CSS keyframe source review',stylesheets:css.length,keyframes:names.length,duplicates:0}));
});
test('A5-049, 054, 056, 063, 068, 074, 086, 187 source mechanisms remain present',()=>{
 assert.match(read('lib/site-assets.ts'),/new Response\(obj\.body/);
 assert.match(read('app/api/study-assets/[id]/route.ts'),/new Response\(obj\.body/);
 assert.match(read('app/api/materials/route.ts'),/SELECT id, name, lecture_id AS lectureId, mime, bytes/);
 assert.match(read('app/api/decks/route.ts'),/SELECT id,name,bytes,page_count/);
 assert.match(read('app/api/academic-config/route.ts'),/env\.DB\.batch\(\[/);
 assert.match(read('public/progress-delta.js'),/function diff\(before,after\)/);
 assert.match(read('app/api/progress/route.ts'),/ProgressDelta\.apply\(prior,body\.patch\)/);
 assert.match(read('public/device-storage.js'),/const cache=new Map\(\),pending=new Map\(\)/);
 assert.match(read('public/learning-ui.js'),/img loading="lazy"/);
 assert.match(read('public/examplify-mode.js'),/function question\(\)\{const d=data\(\),i=d\.current/);
 assert.match(read('lib/personal-upload.ts'),/file\.stream\(\)\.pipeTo\(stream\)/);
});
