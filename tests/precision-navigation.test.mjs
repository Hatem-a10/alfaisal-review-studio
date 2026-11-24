import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {visibleCatalogSets,catalogKind} from '../public/original-catalog.mjs';
test('practice home uses one three-column grid with uniform cards and restricts weak areas to admins',()=>{
 const src=fs.readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../public/redesign.css',import.meta.url),'utf8');
 assert.match(src,/const practiceCards=\[[\s\S]*?\['mock','Timed mock'[\s\S]*?\['sets','Practice a topic'[\s\S]*?\['original','Previous exams & TBLs'[\s\S]*?\['wrong','Wrong answers'[\s\S]*?\['previous','Previous mocks'/);
 assert.equal(src.match(/class="practice-start-actions"/g)?.length,1);
 assert.match(css,/\.practice-start-actions\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/\.practice-tool-card\[data-/);
 assert.doesNotMatch(src,/\['booklet'|Practice results/);
 assert.match(src,/if\(id==='weak'\)return window.reviewAdmin===true/);
 assert.match(src,/practiceCards.filter\(\(\[id\]\)=>toolAvailable\(id\)\)/);
});
test('catalog hides corrected booklet and unlabelled sets and separates courses',()=>{const sets=[{id:'cvp19-cvp-a1-mcq',title:'CVP-A1 · corrected booklet MCQs',category:'exam',batch:19},{id:'cvp19-saq-anatomy',title:'Corrected booklet written',category:'exam',batch:19},{id:'b',title:'Recall',category:'batch',batch:18},{id:'t',title:'TBL 1',category:'tbl',batch:19},{id:'o',title:'Collection',category:'topic'},{id:'unknown',title:'Unlabelled',category:'batch'},{id:'mol-b',title:'MOL recall',category:'batch',batch:19}],before=JSON.stringify(sets);assert.deepEqual(visibleCatalogSets(sets,'all','CVP').map(s=>s.id),['b','t','o']);assert.deepEqual(['past','tbl','other'].map(k=>visibleCatalogSets(sets,k,'CVP').map(s=>s.id)),[['b'],['t'],['o']]);assert.deepEqual(visibleCatalogSets(sets,'all','MOL').map(s=>s.id),['mol-b']);assert.equal(catalogKind(sets[2]),'past');assert.equal(JSON.stringify(sets),before)});
test('booklet route and weak action are guarded independently of practice selection',()=>{const runtime=fs.readFileSync(new URL('../public/phase2-runtime.mjs',import.meta.url),'utf8'),practice=fs.readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');assert.match(runtime,/location\.hash==='#booklet'/);assert.match(runtime,/Phase2Practice\.booklet\(\)/);assert.match(practice,/if\(b\.id==='p2weak'\)\{if\(window\.reviewAdmin!==true\)return/);assert.match(practice,/if\(!booklet\|\|view!=='booklet'\)return/)});

test('corrected booklet written and practical sets and generated mocks are Other',()=>{for(const set of [{id:'cvp19-saq-anatomy',title:'Corrected booklet · Written cases',category:'exam'},{id:'cvp19-ospe-dry',title:'Corrected booklet · OSPE',category:'exam'},{id:'mock',title:'Generated mock',category:'exam',adapted:true}])assert.equal(catalogKind(set),'other')});
