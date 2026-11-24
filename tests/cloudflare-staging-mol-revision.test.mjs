import assert from 'node:assert/strict';
import test from 'node:test';
import {lectureAudit} from '../scripts/audit-lecture-quality.mjs';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

test('MOL 20–28 have real revision summaries and the antioxidant question has distinct options',()=>{
 const {learning,teaching}=assembledLearning();
 for(let n=20;n<=28;n++){
  const guide=teaching.guides['MOL-'+n];
  assert.ok(guide.summary.length>=3,'Missing summary for MOL-'+n);
  assert.ok(guide.summary.every(point=>typeof point==='string'&&point.length>20));
 }
 const question=learning.questions.find(q=>q.id==='MOL-22:defense:depth-1');
 assert.equal(question.answer,0);
 assert.deepEqual(Array.from(question.options),['Glutathione reductase','Glutathione peroxidase','Superoxide dismutase','Catalase']);
 assert.equal(question.reasons.length,4);
 assert.equal(question.appendedOption,true);
});

test('runtime inventory resolves the targeted MOL flags without claiming primary-source editorial approval',()=>{
 const report=lectureAudit();
 for(let n=20;n<=28;n++){
  const lecture=report.lectures.find(l=>l.id==='MOL-'+n);
  assert.ok(lecture);
  assert.ok(!lecture.gaps.includes('revision-summary'),lecture.id);
  assert.equal(lecture.editorialStatus,'editorial-review-pending');
 }
 const lecture=report.lectures.find(l=>l.id==='MOL-22');
 assert.ok(!lecture.questions.invalidMcqs.some(q=>q.id==='MOL-22:defense:depth-1'));
 // CI output records the fresh post-change MOL inventory for regenerating the checked-in audit.
 console.log('MOL_REVIEW_DELTA '+JSON.stringify(report.lectures.filter(l=>/^MOL-2[0-8]$/.test(l.id)).map(l=>({id:l.id,gaps:l.gaps,distinct:l.questions.distinct,medium:l.questions.mediumReasoning,invalid:l.questions.invalidMcqs,missingDifficulty:l.questions.missingDifficulty}))));
});
