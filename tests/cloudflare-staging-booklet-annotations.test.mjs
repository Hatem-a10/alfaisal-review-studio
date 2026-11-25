import test from 'node:test';import assert from 'node:assert/strict';import {mergePractice,bookletAnnotation,mergeBookletAnnotations,selectBooklet} from '../public/phase2-practice-core.mjs';
const t1='2026-11-24T10:00:00Z',t2='2026-11-25T10:00:00Z';
test('annotations merge per field and keep later explicit clears',()=>{
 const q={id:'q',legacyChoices:{old:[0,1]}};
 const a={bookletAnnotations:{q:{flagged:true,flagAt:t1,note:'keep',noteAt:t2}},booklet:{q:{completed:true,at:t1}}};
 const b={bookletAnnotations:{q:{flagged:false,flagAt:t2},old:{note:'old',noteAt:t1}},booklet:{q:{completed:true,correct:true,at:t2}}};
 const merged=mergePractice(a,b);assert.equal(merged.booklet.q.correct,true);assert.equal(bookletAnnotation(q,merged.bookletAnnotations).flagged,false);assert.equal(bookletAnnotation(q,merged.bookletAnnotations).note,'keep');
 const clear=mergeBookletAnnotations(merged.bookletAnnotations,{q:{note:'',noteAt:'2026-11-26T10:00:00Z'}});assert.equal(bookletAnnotation(q,clear).note,'');
});
test('flagged and noted filters remain independent of answer completion',()=>{
 const qs=[{id:'q',type:'mcq'},{id:'r',type:'mcq'}],state={booklet:{q:{completed:true}},bookletAnnotations:{q:{flagged:true,flagAt:t1},r:{note:'review',noteAt:t2}}};
 assert.deepEqual(selectBooklet(qs,{...state,filter:'flagged'}).list.map(q=>q.id),['q']);assert.deepEqual(selectBooklet(qs,{...state,filter:'noted'}).list.map(q=>q.id),['r']);
});
