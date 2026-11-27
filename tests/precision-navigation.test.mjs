import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {visibleCatalogSets,catalogKind,assessmentGroups} from '../public/original-catalog.mjs';
test('practice home uses three uniform centred columns with a centred final row and restricts weak areas to admins',()=>{
 const src=fs.readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../public/redesign.css',import.meta.url),'utf8');
 assert.match(src,/const practiceCards=\[[\s\S]*?\['mock','Timed mock'[\s\S]*?\['original','Previous exams & TBLs'[\s\S]*?\['sets','Practice a topic'[\s\S]*?\['wrong','Wrong answers'[\s\S]*?\['previous','Previous mocks'/);
 assert.equal(src.match(/class="practice-start-actions"/g)?.length,1);
 assert.match(css,/\.practice-start-actions\{[^}]*--pt-cols:3[^}]*justify-content:center/);
 assert.match(css,/\.practice-tool-card\{flex:0 0 calc\(\(100% - \(var\(--pt-cols\) - 1\) \* var\(--pt-gap\)\) \/ var\(--pt-cols\)\)[^}]*align-items:center[^}]*text-align:center/);
 assert.doesNotMatch(css,/\.practice-tool-card\[data-/);
 assert.doesNotMatch(src,/\['booklet'|Practice results/);
 assert.match(src,/if\(id==='weak'\)return window.reviewAdmin===true/);
 assert.match(src,/practiceCards.filter\(\(\[id\]\)=>toolAvailable\(id\)\)/);
});
test('catalog hides corrected booklet and unlabelled sets and separates courses',()=>{const sets=[{id:'cvp19-cvp-a1-mcq',title:'CVP-A1 · corrected booklet MCQs',category:'exam',batch:19},{id:'cvp19-saq-anatomy',title:'Corrected booklet written',category:'exam',batch:19},{id:'b',title:'Recall',category:'batch',batch:18},{id:'t',title:'TBL 1',category:'tbl',batch:19},{id:'o',title:'Collection',category:'topic'},{id:'unknown',title:'Unlabelled',category:'batch'},{id:'mol-b',title:'MOL recall',category:'batch',batch:19}],before=JSON.stringify(sets);assert.deepEqual(visibleCatalogSets(sets,'all','CVP').map(s=>s.id),['b','t','o']);assert.deepEqual(['past','tbl','other'].map(k=>visibleCatalogSets(sets,k,'CVP').map(s=>s.id)),[['b'],['t'],['o']]);assert.deepEqual(visibleCatalogSets(sets,'all','MOL').map(s=>s.id),['mol-b']);assert.equal(catalogKind(sets[2]),'past');assert.equal(JSON.stringify(sets),before)});
test('booklet route and weak action are guarded independently of practice selection',()=>{const runtime=fs.readFileSync(new URL('../public/phase2-runtime.mjs',import.meta.url),'utf8'),practice=fs.readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');assert.match(runtime,/location\.hash==='#booklet'/);assert.match(runtime,/Phase2Practice\.booklet\(\)/);assert.match(practice,/if\(b\.id==='p2weak'\)\{if\(window\.reviewAdmin!==true\)return/);assert.match(practice,/if\(!booklet\|\|view!=='booklet'\)return/)});

test('corrected booklet written and practical sets and generated mocks are Other',()=>{for(const set of [{id:'cvp19-saq-anatomy',title:'Corrected booklet · Written cases',category:'exam'},{id:'cvp19-ospe-dry',title:'Corrected booklet · OSPE',category:'exam'},{id:'mock',title:'Generated mock',category:'exam',adapted:true}])assert.equal(catalogKind(set),'other')});

test('assessment families keep matching TBLs together and promote only the next scheduled TBL',()=>{
 const paper=(title,batch,category)=>({id:title+'-'+batch,title,batch,category});
 const sets=[paper('Renal TBL 1',14,'tbl'),paper('Renal Final MCQs',18,'exam'),
  paper('Renal TBL 2',19,'tbl'),paper('Renal TBL 1',18,'tbl'),
  paper('Instructor practice',19,'other'),paper('Renal TBL 3',17,'tbl')];
 const schedule=[{kind:'tbl',number:1,date:'2026-11-29',endMinute:590},
  {kind:'tbl',number:2,date:'2026-12-06',endMinute:590},
  {kind:'tbl',number:3,date:'2026-12-07',endMinute:590,hubCustom:true}];
 const before=assessmentGroups(sets,schedule,'2026-11-29',589);
 assert.deepEqual(before.map(group=>group.title),['Other','TBL 1','Final exam','TBL 2','TBL 3']);
 assert.deepEqual(before[1].sets.map(set=>set.batch),[18,14]);
 assert.equal(before[1].upcoming,true);
 const after=assessmentGroups(sets,schedule,'2026-11-29',590);
 assert.deepEqual(after.map(group=>group.title),['Other','TBL 2','Final exam','TBL 1','TBL 3']);
 assert.equal(after[1].date,'2026-12-06');
});
