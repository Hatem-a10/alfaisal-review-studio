import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,existsSync}from'node:fs';import{runInNewContext}from'node:vm';import{assembledLearning}from'../scripts/assembled-learning.mjs';
const base=new URL('../public/',import.meta.url),pack=runInNewContext(readFileSync(new URL('cvp-pulmonary-transcript-data.js',base),'utf8')+';CVP_PULMONARY_TRANSCRIPTS');
const{learning,teaching}=assembledLearning();
test('all seven pulmonary transcripts are available with every original page and valid topic practice',()=>{
 assert.equal(pack.sources.length,7);assert.equal(pack.sources.reduce((n,s)=>n+s.pages.length,0),177);
 const ids=new Set();for(const[id,p]of Object.entries(pack.lectures))for(const[sid,change]of Object.entries(p.sections||{})){
  const s=teaching.guides[id].sections.find(s=>s.id===sid);assert.ok(s,sid);
  for(const q of change.questions||[]){assert.ok(!ids.has(q.id),q.id);ids.add(q.id);assert.equal(q.concept,sid);assert.ok(learning.questions.some(x=>x.id===q.id));assert.ok(q.answer>=0&&q.answer<q.options.length);assert.equal(q.options.length,q.reasons.length);assert.equal(new Set(q.options).size,q.options.length);assert.equal(new Set(q.reasons).size,q.reasons.length);assert.ok(q.reasons.every(x=>typeof x==='string'&&x.length>15));for(const r of q.references){assert.ok(learning.sources.find(s=>s.id===r.source)?.pages.some(p=>p.page===r.page),q.id)}}
 }
 const normalize=s=>s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 for(const claim of pack.priorityClaims){assert.ok(['exam','lecturer'].includes(claim.kind));const page=pack.sources.find(s=>s.id===claim.source)?.pages.find(p=>p.page===claim.page);assert.ok(page);assert.ok(claim.quote?.length>15);assert.ok(normalize(page.text).includes(normalize(claim.quote)),claim.source+' p'+claim.page+' quote')}
 for(const f of Object.values(pack.diagrams||{}).flat())assert.ok(existsSync(new URL(f.image.slice(1),base)),f.image);
});
test('explicitly excluded question and topic IDs are absent from every active bank',()=>{
 for(const e of pack.exclusions){for(const id of e.affectedQuestionIds||[])assert.ok(!learning.questions.some(q=>q.id===id),id);for(const id of e.removeSectionIds||[])assert.ok(!Object.values(teaching.guides).some(g=>g.sections?.some(s=>s.id===id)),id)}
 for(const e of pack.exclusions)for(const id of e.affectedSections||[])if(!(e.removeSectionIds||[]).includes(id))assert.ok(Object.values(teaching.guides).some(g=>g.sections?.some(s=>s.id===id)),'Retain in-scope part of mixed topic '+id);
});
test('transcript patch is idempotent and has no saved-progress dependency',()=>{
 const apply=runInNewContext(readFileSync(new URL('cvp-pulmonary-transcript-core.js',base),'utf8')+';applyPulmonaryTranscripts');
 const l=structuredClone(learning),t=structuredClone(teaching),c={},d={};apply(l,t,c,d,pack);const first=JSON.stringify({l,t,c,d});apply(l,t,c,d,pack);assert.equal(JSON.stringify({l,t,c,d}),first);
});
