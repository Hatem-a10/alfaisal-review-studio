import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ProgressDelta as server} from '../lib/progress-delta.js';
import {OspeCore} from '../public/ospe-core.mjs';
import {matchDecks} from '../public/phase3-crosslinks.mjs';
const load=(file,name)=>runInNewContext(readFileSync(new URL('../public/'+file,import.meta.url),'utf8')+'\n'+name,{structuredClone});
const delta=load('progress-delta.js','ProgressDelta'),exam=load('exam-engine.js','ExamEngine'),integrity=load('answer-integrity.js','AnswerIntegrity'),study=load('engine.js','Study'),original=load('original-wrong-engine.js','OriginalWrongEngine');
const plain=x=>JSON.parse(JSON.stringify(x));
test('patch rejects unsafe nested replacement values, including arrays',()=>{
 for(const api of [delta,server])for(const value of [JSON.parse('{"constructor":{"prototype":{"x":1}}}'),[JSON.parse('{"__proto__":{"x":1}}')]])assert.throws(()=>api.apply({records:{},settings:{}},[{path:['settings','new'],value}]),/Unsafe/);
});
test('patch does not traverse inherited parents or accept contradictory operations',()=>{
 for(const api of [delta,server]){assert.throws(()=>api.apply({records:{}},[null]),/operation/);assert.throws(()=>api.apply({records:{q:1}},[{path:['records','q'],remove:true,value:2}]),/Conflicting/);assert.throws(()=>api.apply({records:{}},[{path:['records','toString','x'],value:1}]),/Missing/)}
});
test('deep differences use bounded paths and JSON wire normalization',()=>{
 const deep=v=>{let result={leaf:v};for(let i=0;i<20;i++)result={nested:result};return {records:{a:result},settings:{optional:undefined}}};
 const a=deep(1),b=deep(2);for(const api of [delta,server]){const p=api.diff(a,b);assert.ok(p.every(x=>x.path.length<=16));assert.deepEqual(plain(api.apply(a,p)),plain(b))}
});
test('same-millisecond different attempt IDs never merge answers',()=>{
 const a={id:'a',startedAt:100,answers:{0:0}},b={id:'b',startedAt:100,answers:{0:1},answerVersions:{0:999}};
 assert.equal(integrity.reconcile(a,null,b,100).answers[0],0);
});
test('an equal-version deletion tombstone is not resurrected',()=>{
 const a={startedAt:100,answers:{0:1},answerVersions:{0:200}},b={startedAt:100,answers:{},answerVersions:{0:200}};
 assert.equal(integrity.reconcile(a,a,b,300).answers[0],undefined);
});
const q=(id,course='REN')=>({id,lectureIds:[course+'-1'],question:'Question '+id,options:['A','B'],answer:0,explanation:'Reason',reasons:['yes','no'],kind:'Lecture'});
test('Renal pool never contains other courses and malformed stems are ineligible',()=>{
 assert.deepEqual(plain(exam.pool([q('one'),q('two','MOL')],'REN','all')).map(x=>x.id),['one']);
 assert.equal(exam.usable({...q('a'),question:'  '}),false);
 assert.equal(exam.usable({...q('a'),reasons:[{},'ok']}),false);
});
test('exam answer and pacing writes reject invalid positions, choices and completed attempts',()=>{
 const e={questions:[q('a')],answers:{}};assert.equal(exam.recordChange(e,0,9),false);assert.equal(exam.recordChange(e,-1,0),false);assert.equal(exam.recordChange(e,0,0),true);
 exam.addActiveTime(e,1,1000);assert.equal(e.xp.activeMs,undefined);e.finishedAt='now';assert.equal(exam.recordChange(e,0,1),false);assert.equal(e.answers[0],0);
});
test('unmapped renal original questions retain renal course attribution and duplicate IDs are ignored',()=>{
 const one={...q('ren-paper-q'),type:'mcq',source:'ren-paper'};
 const r=original.adapt({setId:'renal',ids:[one.id,one.id],answers:{[one.id]:0},finishedAt:'2026-11-24T12:00:00Z'},()=>one,()=>null);
 assert.equal(r.questions.length,1);assert.equal(r.questions[0].lectureIds[0],'REN-original-exam');
});
test('missing schedule dates do not generate a phantom daily task and empty readiness is finite',()=>{
 const items=[{id:'REN-A1',course:'REN',dates:[]}];
 assert.equal(study.readiness([],{},'2026-11-24','REN').score,0);
 assert.equal(study.daily(items,{},'2026-11-24',{budget:180}).selected.length,0);
 assert.equal(study.daily([{...items[0],dates:['2026-11-24']}],{},'2026-11-24',{budget:0}).capacity,0);
});
test('one- and two-station OSPE circuits work, finished timer is zero, missing station is not complete',()=>{
 const stations=[{id:'a',category:'histology',parts:[{marks:1}]},{id:'b',category:'dry',parts:[{marks:1}]}];
 assert.equal(OspeCore.circuit(stations,1,90,()=>.5).slots.length,1);assert.equal(OspeCore.circuit(stations,2,90,()=>.5).slots.length,2);
 assert.equal(OspeCore.position({slots:[{station:'a'}],seconds:90,startedAt:'2026-11-24T00:00:00Z'},Date.parse('2026-11-24T00:01:30Z')).remaining,0);
 assert.equal(OspeCore.score({slots:[{station:'missing'}]},stations).complete,false);
});
test('Renal deck matching supports registered course codes and unique cards',()=>{
 const result=matchDecks([{id:'REN-A5',title:'Kidney histology'},{id:'REN-A1',title:'Other lecture'}],[{id:'d',name:'REN 123 A5',cards:[{id:'x'},{id:'x'},{id:'y',schedule:{queue:-1}}]}]);
 assert.deepEqual(result.get('REN-A5')[0].cardIds,['x']);assert.equal(result.has('REN-A1'),false);
});
