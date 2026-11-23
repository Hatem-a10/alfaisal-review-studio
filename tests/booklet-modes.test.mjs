import {test} from 'node:test';import assert from 'node:assert/strict';import {selectBooklet,randomizeBooklet,advanceBooklet,previousBooklet,mergePractice} from '../public/phase2-practice-core.mjs';
const questions=[{id:'cvp19-mcq-1',type:'mcq'},{id:'cvp19-saq-1',type:'short'},{id:'cvp19-ospe-1',type:'short'},{id:'cvp19-mcq-2',type:'mcq'}];
test('random order is stable through reload, complete, and leaves source untouched',()=>{const before=structuredClone(questions),s={filter:'all',bookletRandom:true};randomizeBooklet(questions,s,()=>0);const order=selectBooklet(questions,s).list.map(q=>q.id);assert.equal(new Set(order).size,4);assert.notDeepEqual(order,questions.map(q=>q.id));assert.deepEqual(selectBooklet(questions,JSON.parse(JSON.stringify(s))).list.map(q=>q.id),order);assert.deepEqual(questions,before)});
test('SAQ and OSPE independently excluded across all filters and pinned questions',()=>{for(const filter of ['all','unanswered','wrong','completed']){const s={filter,bookletIncludeSAQ:false,bookletIncludeOSPE:false,bookletViewId:'cvp19-ospe-1',booklet:Object.fromEntries(questions.map(q=>[q.id,{completed:true,correct:filter==='completed'}]))};const {list,question}=selectBooklet(questions,s);assert.ok(list.every(q=>q.type==='mcq'));assert.ok(!question||question.type==='mcq')}});
test('back then forward follows viewed question rather than stale cursor',()=>{const s={filter:'all',position:0};advanceBooklet(questions,s);advanceBooklet(questions,s);previousBooklet(questions,s);assert.equal(selectBooklet(questions,s).question.id,questions[1].id);advanceBooklet(questions,s);assert.equal(selectBooklet(questions,s).question.id,questions[2].id);advanceBooklet(questions,s);assert.equal(selectBooklet(questions,s).question.id,questions[3].id)});
test('newer mode preferences merge without losing answer progress',()=>{const a={navigationAt:'2026-11-16T10:00:00Z',booklet:{one:{completed:true,at:'2026-11-16T10:00:00Z'}}},b={navigationAt:'2026-11-16T11:00:00Z',bookletRandom:true,bookletRandomOrder:['two','one'],bookletIncludeSAQ:false,bookletIncludeOSPE:true};const m=mergePractice(a,b);assert.equal(m.bookletRandom,true);assert.equal(m.bookletIncludeSAQ,false);assert.equal(m.bookletIncludeOSPE,true);assert.deepEqual(m.bookletRandomOrder,b.bookletRandomOrder);assert.equal(m.booklet.one.completed,true)});


test('explicit Renal SAQs and OSPEs can be practiced independently',()=>{
 const questions=[{id:'ren-booklet-p3-q1',type:'mcq'}, {id:'ren-booklet-saq-p191-1',type:'saq'}, {id:'ren-booklet-ospe-p228-1',type:'ospe'}];
 const onlyOSPE=selectBooklet(questions,{bookletIncludeMCQ:false,bookletIncludeSAQ:false}).list;
 assert.deepEqual(onlyOSPE,[questions[2]]);
 const onlySAQ=selectBooklet(questions,{bookletIncludeMCQ:false,bookletIncludeOSPE:false}).list;
 assert.deepEqual(onlySAQ,[questions[1]]);
});
