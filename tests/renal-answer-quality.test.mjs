import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renalTeachingPack,renalLessons,validateRenalLessons} from '../public/renal-lessons.mjs';
import {anatomyChecks} from '../public/renal-anatomy-checks.mjs';
import {renalPhysiology} from '../public/renal-physiology.mjs';

test('every current Renal practice check has a unique ID, checked answer, and four useful option rationales',()=>{
 const pack=renalTeachingPack();
 assert.equal(renalLessons.length,14);
 assert.equal(renalPhysiology.length,4);
 assert.equal(pack.questions.length,175);
 assert.equal(new Set(pack.questions.map(question=>question.id)).size,175);
 for(const q of pack.questions){
  assert.equal(q.options.length,4,q.id);
  assert.equal(q.reasons.length,q.options.length,q.id);
  assert.ok(q.options.every(option=>typeof option==='string'&&option.trim()),q.id);
  assert.ok(q.reasons.every(reason=>typeof reason==='string'&&reason.trim().length>=8),q.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,q.id);
  assert.equal(q.reasons[q.answer],q.explanation,q.id);
 }
});

test('slit diaphragm feedback distinguishes podocyte processes from the nephrin diaphragm itself',()=>{
 const questions=renalTeachingPack().questions;
 const q=questions.find(question=>question.question.startsWith('Between which structures do the glomerular filtration slit diaphragms form?'));
 assert.ok(q);
 assert.match(q.explanation,/Nephrin-containing/);
 assert.match(q.options[q.answer],/podocyte/);
 assert.ok(q.reasons.every(Boolean));
});

test('the validator fails closed for incomplete distractor explanations',()=>{
 const changed=structuredClone(renalLessons);
 changed[0].topics[0].checks[0][2][1]='';
 assert.throws(()=>validateRenalLessons(changed),/option-specific explanations/);
 assert.ok(anatomyChecks['A1-aorta'].some(row=>row.some(value=>typeof value==='string'&&value.includes('ren-booklet-p93'))));
});
test('Renal teaching concepts cover every objective and identify lecturer-confirmed scope',()=>{
 const {guides,sources}=renalTeachingPack();
 const knownSources=new Set(sources.map(source=>source.id));
 assert.equal(Object.keys(guides).length,14);
 assert.equal(guides['REN-A4'].underDevelopment,false);
 assert.deepEqual(guides['REN-A4'].sections.map(section=>section.id),['REN-A4-section','REN-A4-segments','REN-A4-clinical']);
 assert.equal(guides['REN-A3'].underDevelopment,false);
 assert.equal(guides['REN-A3'].sections[0].transcriptReview.asset,'kidney-anatomy-1-transcript');
 assert.ok(guides['REN-A4'].sections.every(section=>section.transcriptReview.asset==='kidney-anatomy-2-transcript'&&section.figure));
 for(const [id,guide] of Object.entries(guides)){
  const concepts=guide.sections.flatMap(section=>section.concepts);
  assert.ok(concepts.length>0,id);
  if(id==='REN-A4')assert.equal(concepts.length,6);
  assert.equal(guide.underDevelopment,!guide.sections.some(section=>section.transcript||section.transcriptReview),id);
  assert.deepEqual(new Set(concepts.map(concept=>concept.objective)),new Set(guide.objectives),id);
  for(const concept of concepts){
   assert.ok(concept.references.length>0,id);
   assert.ok(concept.references.every(ref=>knownSources.has(ref.source)&&Number.isInteger(ref.page)&&ref.page>0),id);
  }
 }
 const sections=Object.values(guides).flatMap(guide=>guide.sections);
 assert.deepEqual([...new Set(sections.flatMap(section=>section.transcript?[section.transcript]:[]))].length,8);
 const cues=sections.flatMap(section=>section.recordedExamCue?[section.recordedExamCue]:[]);
 assert.deepEqual(cues.map(cue=>[cue.label,cue.time]),[['Identify the lining of a blood vessel','25:13']]);
 assert.equal(sections.find(section=>section.scopeNote)?.scopeNote.time,'29:29');
});
