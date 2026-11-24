import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
const markup=(attrs='',label='A')=>'<div class="answer-options"><label class="answer-option"><input type="radio" value="0" '+attrs+'><span class="option-letter">'+label+'</span><span>one</span></label></div>';
function harness(strikes={},overrides={}){
 const ctx={optionStrikes:strikes,decorateOptions:null,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),document:{addEventListener(){},querySelector(){return null}},render(){},...overrides};
 runInNewContext(read('choice-ui.js')+'\nthis.api={choiceKey,strikeValues,strikeValue,decorateOptions,clearChoiceDraft,handleChoiceElimination}',ctx);
 return ctx;
}
test('saved elimination cannot erase a restored selection on render',()=>{
 const h=harness({q:['one']}),html=h.api.decorateOptions(markup('checked'),{id:'q',options:['one','two']});
 assert.match(html,/value="0" checked/);assert.match(html,/data-current-selection>A</);
 assert.doesNotMatch(html,/data-clear-eliminated|data-eliminated="true"/);
});
test('submitted choice remains checked and its elimination button is locked',()=>{
 const h=harness({q:['one']}),html=h.api.decorateOptions(markup('checked disabled'),{id:'q',options:['one','two']});
 assert.match(html,/checked disabled/);assert.match(html,/data-answer-locked="true"/);assert.match(html,/aria-pressed="false" disabled/);
});
test('radio attribute matching ignores incidental disabled/checked words in choice text',()=>{
 const h=harness({q:['one']}),html=h.api.decorateOptions(markup().replace('>one<','> checked disabled <'),{id:'q',options:['one','two']});
 assert.match(html,/data-answer-locked="false"/);assert.match(html,/data-eliminated="true"/);
});
test('malformed elimination values and prototype collisions are harmless',()=>{
 const h=harness({q:{bad:true}});assert.doesNotThrow(()=>h.api.decorateOptions(markup(),{id:'q',options:['one']}));
 assert.equal(h.api.strikeValues('toString').length,0);
});
test('imported choice identity includes options; repeated option labels are independent',()=>{
 const h=harness();assert.notEqual(h.api.choiceKey({question:'stem',options:['a','b']}),h.api.choiceKey({question:'stem',options:['a','c']}));
 assert.notEqual(h.api.strikeValue({options:['same','same']},0),h.api.strikeValue({options:['same','same']},1));
});
test('eliminating an inline selection saves the cleared draft immediately',()=>{
 const session={answers:{0:1},graded:{}},lesson={},calls=[];
 const h=harness({}, {lessonId:'L',lessonById:()=>lesson,inlineSession:()=>session,inlineSaveDraft:(...a)=>calls.push(a)});
 assert.equal(h.api.clearChoiceDraft({dataset:{inlineQuestion:'0'}}),true);assert.equal(Object.hasOwn(session.answers,0),false);assert.equal(calls.length,1);
 session.graded[0]=true;session.answers[0]=1;
 assert.equal(h.api.clearChoiceDraft({dataset:{inlineQuestion:'0'}}),false);assert.equal(session.answers[0],1);
});
test('elapsed mock deadline retains stored response and completes the run',()=>{
 const etExam={answers:{0:1}},finished=[];
 const h=harness({}, {etExam,ExamEngine:{remaining:()=>0},etFinishExam:r=>finished.push(r)});
 assert.equal(h.api.clearChoiceDraft({dataset:{etMode:'mock',etAnswer:'0'}}),false);assert.equal(etExam.answers[0],1);assert.deepEqual(finished,['expired']);
});
test('image zoom has keyboard access and cleans up previous callbacks',()=>{
 const s=read('phase2-image-zoom.mjs');assert.match(s,/image.tabIndex=0/);assert.match(s,/\['Enter',' '\]/);assert.match(s,/if\(figure!==clone\)return/);assert.match(s,/if\(figure===clone\)status.textContent/);assert.match(s,/pointers.clear\(\);figure=null;viewport.replaceChildren\(\)/);assert.match(s,/if\(clone.complete&&clone.naturalWidth\)ready\(\)/);
});
