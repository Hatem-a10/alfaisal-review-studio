import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../public/exam-engine.js',import.meta.url),'utf8')+';globalThis.engine=ExamEngine',context);
const E=context.engine;
test('paused deadline survives serialization and resumes with the same remaining time',()=>{let e={deadline:61000,finishedAt:null};assert.equal(E.setPaused(e,true,11000),true);assert.equal(E.remaining(e,300000),50);e=JSON.parse(JSON.stringify(e));E.setPaused(e,false,311000);assert.equal(E.remaining(e,311000),50);assert.equal(E.remaining(e,321000),40)});
test('untimed original remains untimed and expired exam cannot be paused',()=>{const original={};E.setPaused(original,true,100);E.setPaused(original,false,500);assert.equal(original.deadline,undefined);assert.equal(E.setPaused({deadline:100},true,100),false)});
test('only changes from correct to incorrect are counted',()=>{const e={questions:[{answer:1}],answers:{},xp:{}};E.recordChange(e,0,1);E.recordChange(e,0,2);E.recordChange(e,0,0);E.recordChange(e,0,1);E.recordChange(e,0,0);assert.equal(e.xp.rightToWrong[0],2);E.addActiveTime(e,0,1250);E.addActiveTime(e,0,750);assert.equal(e.xp.activeMs[0],2000)});
test('answer reveal and pause controls are gated by cheat mode',()=>{const s=readFileSync(new URL('../public/examplify-mode.js',import.meta.url),'utf8');assert.match(s,/cheatEnabled\(\)&&d\.showAnswer/);assert.match(s,/t\.id==='xpPauseTimer'&&cheatEnabled\(\)/);assert.doesNotMatch(s,/data-xp-action="addTime"/)});
test('Accurate refuses to silently discard a colliding mandatory family',async()=>{const {chooseAccurate}=await import('../public/cvp-accurate-engine.mjs');const q={source:'cvp-final-repeat-mock',mandatory:true,id:'one',question:'A repeated mandatory question',options:['a','b','c','d'],answer:0,lectureIds:['CVP-1'],examCategory:'K.01'};assert.throws(()=>chooseAccurate([],[q,{...q,id:'two'}],76,{anatomy:1},()=>.5),/Required repeat families overlap/)});

test('exam keyboard shortcuts expose highlighter, eraser, toolkit and review with Escape cancellation',()=>{
 const s=readFileSync(new URL('../public/examplify-mode.js',import.meta.url),'utf8');
 for(const key of ['F','H','X','T'])assert.match(s,new RegExp('aria-keyshortcuts="'+key+'"'));
 assert.match(s,/const action=\{h:'highlight',x:'erase',t:'toolkit',r:'review',n:'scratch'\}\[key\]/);
 assert.match(s,/if\(key==='escape'\)/);
 assert.match(s,/e\.target\.closest\('input,textarea,select/);
 assert.match(s,/e\.repeat\|\|e\.isComposing/);
 assert.match(s,/<kbd>Esc<\/kbd>/);
});
