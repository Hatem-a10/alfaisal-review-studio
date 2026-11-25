import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {bookletMockQuestions} from '../public/reviewed-mock-pool.mjs';
import {withQuestionContext} from '../public/cvp19-booklet.mjs';

const engine=runInNewContext(readFileSync(new URL('../public/exam-engine.js',import.meta.url),'utf8')+';ExamEngine');
const contextual={id:'context',type:'saq',question:'Specimen A stem',figures:[{image:'/specimen.webp'}]};
const q={id:'reviewed',type:'mcq',group:'P1 & P2: Booklet topic',question:'Synthetic case?',answer:0,acceptedAnswers:[0,1],options:['first','second','third'],page:3,reviewed:true,contextQuestionIds:['context'],explanation:'Reviewed explanation',reasons:['First','Second','Third']};
const items=[{course:'REN',id:'REN-P1'},{course:'REN',id:'REN-P2'},{course:'REN',id:'REN-A2'},{course:'MOL',id:'MOL-1'}];

test('mocks receive reviewed choices, keys, context, figure and supported booklet heading mappings',()=>{
 const issues={...q,id:'no-figure',sourceIssue:'Figure missing'},invalid={...q,id:'no-key',answer:null};
 const pack={questions:[contextual,q,issues,invalid]};
 const bank=bookletMockQuestions(pack,'REN',items,withQuestionContext);
 assert.equal(bank.length,1);
 const [row]=bank;
 assert.deepEqual(row.options,q.options);
 assert.deepEqual(row.lectureIds,['REN-P1','REN-P2']);
 assert.match(row.question,/Specimen A stem/);
 assert.equal(row.image,'/specimen.webp');
 assert.equal(row.id,q.id);
 assert.equal(row.explanation,q.explanation);
 assert.equal(engine.pool(bank,'REN','all',['REN-P2']).length,1);
 assert.equal(engine.pool(bank,'REN','all',['REN-A2']).length,0);
 assert.equal(engine.pool(bank,'MOL','all').length,0);
});

test('both reviewed keys count after shuffling, and a switch between them is still correct',()=>{
 const [row]=bookletMockQuestions({questions:[{...q,group:'MOL 1: Synthetic',contextQuestionIds:[]}]},'MOL',items,withQuestionContext);
 assert.deepEqual(row.lectureIds,['MOL-1']);
 const attempt=engine.create([{...row,preserveOptionOrder:false}],1,60,1000,()=>0);
 const [a,b]=attempt.questions[0].acceptedAnswers;
 assert.equal(new Set([attempt.questions[0].options[a],attempt.questions[0].options[b]]).size,2);
 assert.equal(attempt.questions[0].options[b],'second');
 engine.recordChange(attempt,0,a);
 engine.recordChange(attempt,0,b);
 assert.equal(engine.grade(attempt).correct,1);
 assert.equal(attempt.xp.rightToWrong?.[0],undefined);
 engine.recordChange(attempt,0,attempt.questions[0].options.indexOf('third'));
 assert.equal(attempt.xp.rightToWrong[0],1);
});

test('a saved receipt keeps both approved keys and validates a correct alternative',()=>{
 const api=runInNewContext(readFileSync(new URL('../public/study-reliability-core.js',import.meta.url),'utf8')+';StudioReliability');
 const receipt=api.receipt('mock','mock',[q],{0:1});
 assert.equal(receipt.correct,1);
 assert.deepEqual(Array.from(receipt.questions[0].acceptedKeys),[0,1]);
 assert.equal(api.validReceipt(receipt),true);
 receipt.questions[0].acceptedKeys=[0,5];
 assert.equal(api.validReceipt(receipt),false);
});
