import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renalTeachingPack,renalLessons,validateRenalLessons} from '../public/renal-lessons.mjs';
import {anatomyChecks} from '../public/renal-anatomy-checks.mjs';
import {renalPhysiology} from '../public/renal-physiology.mjs';

test('every current Renal practice check has a unique ID, checked answer, and four useful option rationales',()=>{
 const pack=renalTeachingPack();
 assert.equal(renalLessons.length,8);
 assert.equal(renalPhysiology.length,4);
 assert.equal(pack.questions.length,125);
 assert.equal(new Set(pack.questions.map(question=>question.id)).size,125);
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