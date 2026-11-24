import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const q=(id,lectureIds,extra={})=>({id,lectureIds,question:id,options:['one','two'],answer:0,explanation:'ok',reasons:['yes','no'],kind:'Past exam',...extra});
const items=[{id:'MOL-1',course:'MOL',code:'1',title:'Molecular'},{id:'REN-A1',course:'REN',code:'A1',title:'Renal'},{id:'CVP-P1',course:'CVP',code:'P1',title:'Archived'}];
const bank=[q('m',['MOL-1']),q('r',['REN-A1']),q('c',['CVP-P1']),q('bad',['MOL-1'],{answer:99}),q('cross',['MOL-1','REN-A1'])];
function harness(){
 const listeners={},ctx={DATA:{items},LEARNING:{questions:bank},TOPIC_CHECKS:{topic:[q('supplement',['MOL-1'])]},etBank:()=>[bank[0]],etScope:'MOL',etMockScope:'MOL',etMockType:'exam',etAccurate:false,reviewStudyItemVisible:x=>x.course!=='CVP'&&!x.lectureIds?.some(id=>id.startsWith('CVP-')),title:x=>x.title,esc:String,render(){},document:{addEventListener:(type,fn)=>listeners[type]=fn},etSet:{questions:[]}};
 const api=runInNewContext(read('exam-engine.js')+'\n'+read('lesson-mix-controls.js')+'\n;({lessonMix,mixBank,mixEligible,mixRows,mixSelected,mixPool,mixControls})',ctx);
 ctx.phase2MockPool=()=>[bank[0],q('orig',['MOL-1'])];return {ctx,api,listeners};
}
test('mixed set rows and questions are restricted to selected course and valid visible evidence',()=>{
 const {ctx,api}=harness();api.lessonMix.sets={enabled:true,ids:['MOL-1','REN-A1','CVP-P1','MOL-1']};
 assert.deepEqual(Array.from(api.mixSelected('sets')),['MOL-1']);
 assert.deepEqual(Array.from(api.mixPool('sets'),x=>x.id).sort(),['m','supplement']);
 assert.match(api.mixControls('sets'),/1 lessons · 2 questions/);
 assert.doesNotMatch(api.mixControls('sets'),/Renal|Archived/);
 ctx.etScope='REN';
 assert.deepEqual(Array.from(api.mixPool('sets'),x=>x.id),['r']);
 assert.match(api.mixControls('sets'),/REN 123/);
});
test('mock selector uses verified candidates and includes original-only questions',()=>{
 const {api}=harness();api.lessonMix.mock={enabled:true,ids:['MOL-1','REN-A1']};
 assert.deepEqual(Array.from(api.mixPool('mock'),q=>q.id),['m','orig']);
 assert.match(api.mixControls('mock'),/1 lessons · 2 questions/);
});
test('bulk and stale controls use the same eligible rows and do not discard unrelated set when toggling mock',()=>{
 const {ctx,api,listeners}=harness();const source=read('mastery-mix.js').slice(read('mastery-mix.js').indexOf("document.addEventListener('change'"));
 runInNewContext(source,ctx);
 const click=dataset=>listeners.click({target:{closest:()=>({dataset})}});
 const change=(dataset,checked=true)=>listeners.change({target:{dataset,checked}});
 click({mixAll:'sets'});assert.deepEqual(Array.from(api.lessonMix.sets.ids),['MOL-1']);
 change({mixLesson:'CVP-P1',mixMode:'sets'});assert.deepEqual(Array.from(api.lessonMix.sets.ids),['MOL-1']);
 ctx.etSet={keep:true};change({mixEnabled:'mock'});assert.equal(ctx.etSet.keep,true);
 click({mixClear:'sets'});assert.equal(api.lessonMix.sets.ids.length,0);
 change({mixEnabled:'unknown'});click({mixAll:'unknown'});
});
