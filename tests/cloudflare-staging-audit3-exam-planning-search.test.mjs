import test from 'node:test';
import assert from 'node:assert/strict';
import {nearDuplicate,deduplicateQuestions} from '../public/phase2-question-quality.mjs';
import {pacingSummary} from '../public/phase2-pacing.mjs';
import {historyDates,questionHistory} from '../public/activity-metrics.mjs';
import {planStudent} from '../public/onboarding-plan.mjs';
import {readFileSync} from 'node:fs';
test('opposite meaning long stems are not deduplicated',()=>{
 const base='In this very specific clinical case which statement about the identified tissue cell mechanism could be considered scientifically and medically ';
 const suffix=' based on the presented experimental evidence and available clinical observations in the reference dataset';
 const a={question:base+'correct'+suffix},b={question:base+'incorrect'+suffix};
 assert.equal(nearDuplicate(a,b),false);assert.equal(deduplicateQuestions([a,b]).length,2);
 assert.equal(deduplicateQuestions([a,{...a}]).length,1);
});
test('pacing average uses only timed questions',()=>{
 const p=pacingSummary({questions:[{}, {}, {}],xp:{activeMs:{0:2000,2:4000}}});
 assert.equal(p.timedQuestions,2);assert.equal(p.averageMs,3000);assert.equal(p.totalMs,6000);
});
test('history rendering is bounded without removing underlying dates',()=>{
 const history={'2000-01-01':{},'2026-02-30':{}};
 assert.equal(historyDates('2026-11-24',history,{},{}).length,366);
 assert.equal(Object.keys(history).length,2);
});
test('new question timing uses the first recorded answer date',()=>{
 const snapshot={finishedAt:'2026-11-24T22:00:00Z',questions:[{id:'one'}],answers:{0:1},xp:{answeredAt:{0:'2026-11-24T18:00:00Z'}}};
 assert.deepEqual(questionHistory({}, {mocks:[{snapshot}]}),{'2026-11-24':1});
});
test('zero-budget renal onboarding leaves unscheduled reviews explicit',()=>{
 const result=planStudent([{id:'REN-A5',course:'REN',dates:[]}],{},new Date('2026-11-24T12:00:00Z'),{},{budget:0});
 assert.deepEqual(result.records['REN-A5'].dates,[]);assert.equal(result.warnings.length,3);
});
test('runtime avoids automatic saved mock eviction and opens search without full enrichment',()=>{
 const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
 assert.match(read('phase2-practice.mjs'),/updateSnapshot\(d.mocks,exam,true\)/);
 assert.doesNotMatch(read('phase2-practice.mjs'),/Older saved mocks were removed/);
 assert.match(read('phase1-runtime.mjs'),/if\(enrich\)await window.reviewEnsureCourses/);
 assert.match(read('phase1-search.mjs'),/!input.value.trim\(\)/);
});
