import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyReviewedBookletErrata,reviewedBookletErrata,reviewedRevision} from '../public/cvp19-booklet-reviewed-errata.mjs';
import {reviewNotes} from '../public/cvp19-booklet.mjs';

const original=JSON.parse(fs.readFileSync(new URL('../public/cvp19-booklet.json',import.meta.url),'utf8'));
const corrected=applyReviewedBookletErrata(original);
const byId=new Map(corrected.questions.map(question=>[question.id,question]));

test('six explicit source corrections preserve all question IDs, printed keys, and the immutable original',()=>{
 const ids=Object.keys(reviewedBookletErrata);
 assert.equal(ids.length,6);
 assert.equal(corrected.revision,reviewedRevision);
 assert.equal(corrected.questions.length,original.questions.length);
 assert.equal(new Set(corrected.questions.map(question=>question.id)).size,original.questions.length);
 assert.deepEqual(corrected.questions.map(question=>question.id),original.questions.map(question=>question.id));
 for(let i=0;i<corrected.questions.length;i++){
   const a=original.questions[i],b=corrected.questions[i];
   assert.equal(a.printedAnswer,b.printedAnswer);
   assert.deepEqual(a.figures,b.figures);
   assert.deepEqual(a.references,b.references);
   assert.equal(a.id,b.id);
   if(!ids.includes(a.id)){
     assert.deepEqual({...b,bookletRevision:a.bookletRevision},a);
   }
 }
 assert.equal(original.questions.find(q=>q.id==='cvp19-mcq-328').answer,3);
});

test('corrected options and answer mapping always have option-specific rationales',()=>{
 for(const [id,patch] of Object.entries(reviewedBookletErrata)){
  const q=byId.get(id);
  assert.ok(q,id);
  assert.equal(q.options.length,q.reasons.length,id);
  assert.ok(q.reasons.every(reason=>reason&&reason.trim().length>=18),id);
  assert.ok(q.explanation.length>=50,id);
  assert.ok(q.acceptedAnswers.every(i=>i>=0&&i<q.options.length),id);
  if(q.answer===null)assert.ok(q.acceptedAnswers.length>1,id);
  else assert.deepEqual(q.acceptedAnswers,[q.answer],id);
  assert.equal(q.sourceIssue,patch.sourceIssue);
 }
 assert.deepEqual(byId.get('cvp19-mcq-3').options,['K+','Na+','Cl⁻','Ca²⁺']);
 assert.equal(byId.get('cvp19-mcq-236').options.length,5);
 assert.match(byId.get('cvp19-mcq-213').explanation,/venous pooling/);
 for(const id of ['cvp19-mcq-19','cvp19-mcq-328','cvp19-mcq-362'])assert.equal(byId.get(id).answer,null);
});

test('snapshots receive reviewed explanations only when choice order remains aligned',()=>{
 const q=byId.get('cvp19-mcq-213');
 const saved={...q,answer:99,explanation:'old',reasons:['old'],options:q.options.slice(),figures:[{image:'snapshot-figure'}]};
 const before=structuredClone(saved),next=reviewNotes(saved,corrected);
 assert.deepEqual(saved,before);
 assert.equal(next.answer,99);
 assert.deepEqual(next.figures,saved.figures);
 assert.deepEqual(next.reasons,q.reasons);
 assert.match(next.explanation,/Option letters follow booklet order/);
 const shuffled={...saved,options:saved.options.slice().reverse()};
 const unaligned=reviewNotes(shuffled,corrected);
 assert.deepEqual(unaligned.options,shuffled.options);
 assert.deepEqual(unaligned.reasons,shuffled.reasons);
});

test('unexpected source revisions or changed source options fail closed',()=>{
 assert.throws(()=>applyReviewedBookletErrata({...original,revision:'future-source'}),/Unexpected booklet revision/);
 const tampered=structuredClone(original);
 tampered.questions.find(q=>q.id==='cvp19-mcq-3').options[0]='unknown choice';
 assert.throws(()=>applyReviewedBookletErrata(tampered),/source changed/);
});
test('booklet UI marks uncertain keys as source alternatives rather than definitive answers',async()=>{
 const {bookletAnswerDetails}=await import('../public/phase2-practice.mjs');
 const disputed=byId.get('cvp19-mcq-328');
 const html=bookletAnswerDetails(disputed,{completed:true});
 assert.match(html,/Accepted source alternatives \(self-check\):/);
 assert.match(html,/Why each option fits or fails/);
 assert.match(html,/Below RV is not a normal physiological lung volume/);
 assert.equal(bookletAnswerDetails(disputed,{completed:false}),'');
});

test('only uniquely keyed MCQs get automatic grading; disputed keys require self-assessment',async()=>{
 const {bookletCheckResult}=await import('../public/phase2-practice.mjs');
 assert.deepEqual(bookletCheckResult(byId.get('cvp19-mcq-213'),4,'now'),{answer:4,correct:true,completed:true,at:'now'});
 assert.deepEqual(bookletCheckResult(byId.get('cvp19-mcq-213'),0,'now'),{answer:0,correct:false,completed:true,at:'now'});
 assert.deepEqual(bookletCheckResult(byId.get('cvp19-mcq-328'),0,'now'),{answer:0,revealed:true,at:'now'});
 assert.deepEqual(bookletCheckResult(byId.get('cvp19-mcq-328'),2,'now'),{answer:2,revealed:true,at:'now'});
 assert.throws(()=>bookletCheckResult(byId.get('cvp19-mcq-328'),4,'now'),/Invalid booklet selection/);
});
