import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

const pack=JSON.parse(readFileSync('public/lesson-expansion-data.json','utf8'));
const lab=JSON.parse(readFileSync('public/cvp-source-walkthroughs.json','utf8'));
const {learning,teaching,checks}=assembledLearning();

test('expanded lessons retain their topic IDs, substantial teaching and real page references',()=>{
 const sources=new Map(learning.sources.map(s=>[s.id,new Set((s.pages||[]).map(p=>p.page))]));
 const partialLessons=new Set(['CVP-P3','CVP-P12']); assert.equal(Object.keys(pack).filter(id=>!partialLessons.has(id)).length,19);
 for(const [id,entry] of Object.entries(pack)){
  const guide=teaching.guides[id];
  assert.equal(guide.sections.length,Object.keys(entry.sections).length,id);
  const words=guide.sections.flatMap(t=>t.body).join(' ').split(/\s+/).length;
  assert.ok(words>=340,id+' has '+words+' words');
  if(/^CVP-A(18|19|20|21)$/.test(id))assert.ok(words>=800,id);
  for(const [sectionId,section] of Object.entries(entry.sections)){
   const target=guide.sections.find(t=>t.id===sectionId&&t.title===section.title);
   assert.ok(target);
   for(const ref of target.references)assert.ok(sources.get(ref.source)?.has(ref.page),sectionId+' '+ref.source+':'+ref.page);
  }
 }
});

test('priority lectures include independent retrieval activities and source-linked applied questions',()=>{
 for(const id of ['CVP-A18','CVP-A19','CVP-A20','CVP-A21']){
  const guide=teaching.guides[id];
  assert.ok(guide.fillBlanks.some(a=>a.id===id+':expanded-blank'));
  assert.ok(guide.matching.some(a=>a.id===id+':expanded-matching'&&a.pairs.length>=4));
  for(const q of pack[id].questions||[]){
   assert.ok(checks[q.concept].some(row=>row.id===q.id));
   assert.equal(q.options.length,4);
   assert.equal(new Set(q.reasons).size,4);
   assert.equal(q.reasons[q.answer],q.explanation);
  }
 }
});

test('CVP source walkthroughs attach to existing topics with valid references',()=>{
 const sources=new Map(learning.sources.map(source=>[source.id,source]));
 for(const [id,{sections}] of Object.entries(lab)){
  for(const sectionId of Object.keys(sections)){
   const section=teaching.guides[id].sections.find(item=>item.id===sectionId);
   assert.ok(section.body.some(paragraph=>paragraph === sections[sectionId].body.at(-1)),sectionId);
   for(const {source,page} of section.references)assert.ok(sources.get(source)?.pages.some(item=>item.page===page));
  }
 }
});
