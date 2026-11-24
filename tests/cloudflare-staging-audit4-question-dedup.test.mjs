import test from 'node:test';
import assert from 'node:assert/strict';
import {nearDuplicate,duplicateKey,deduplicateQuestions} from '../public/phase2-question-quality.mjs';
const question=(stem,extra={})=>({question:stem,options:['A','B'],answer:0,...extra});
const long='In this very specific clinical case which statement about the identified tissue cell mechanism could be considered scientifically and medically ';
test('malformed question rows cannot crash or enter the deduplicated pool',()=>{
 const good=question('A valid stem?');assert.equal(duplicateKey(null),null);
 assert.deepEqual(deduplicateQuestions([null,{},question('   '),question('Bad options',{options:'A'}),good]),[good]);
 assert.equal(nearDuplicate(good,question('Bad',{options:[null]})),false);
 assert.deepEqual(deduplicateQuestions({}),[]);
});
test('decimal, comparator and reversed critical values retain distinct clinical meaning',()=>{
 for(const [a,b] of [['1.5','5.1'],['<5','>5'],['left before right','right before left'],['Na+/K+','Na+/Ca+']]){
  const x=question(long+a),y=question(long+b);
  assert.equal(nearDuplicate(x,y),false);assert.equal(deduplicateQuestions([x,y]).length,2);
 }
});
test('ordered near matching rejects reordered causal claims and preserves small textual edits',()=>{
 const x=question(long+'protein activates enzyme within the cell under the experimental conditions described in the source');
 const y=question(long+'enzyme activates protein within the cell under the experimental conditions described in the source');
 assert.equal(nearDuplicate(x,y),false);
 assert.equal(nearDuplicate(x,question(x.question.replace('experimental','observed'))),true);
});
test('single figure and answer-text identity are part of duplicate matching',()=>{
 const x=question('Identify this structure',{figure:{image:'/a.webp'}});
 const y=question('Identify this structure',{figure:{image:'/b.webp'}});
 assert.equal(deduplicateQuestions([x,y]).length,2);
 const same=question('Identify this structure',{figure:{image:'/a.webp'},options:['B','A'],answer:1});
 assert.equal(deduplicateQuestions([x,same]).length,1);
 const conflict={...x,answer:1};
 assert.equal(deduplicateQuestions([x,conflict]).length,2);
});
test('cache invalidates after a key change, malformed canonical identifiers cannot create a family',()=>{
 const a=question('Same question',{canonicalId:'family'}),b={...a};
 assert.equal(nearDuplicate(a,b),true);b.answer=1;assert.equal(nearDuplicate(a,b),false);
 const wrong={};
 assert.equal(deduplicateQuestions([question('One',{canonicalId:wrong}),question('Two',{canonicalId:wrong})]).length,2);
});
