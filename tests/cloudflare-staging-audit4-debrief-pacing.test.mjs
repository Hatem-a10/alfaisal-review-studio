import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/study-insights.js',import.meta.url),'utf8');
function harness(pickerValue='0'){
 const picker={value:pickerValue,getClientRects:()=>[{}]},xp={querySelector:q=>q==='#xpQuestionPick'?picker:null};
 const start=source.indexOf(' let tracked='),end=source.indexOf(' const finishMock=',start);
 const ctx={document:{querySelector:()=>xp},innerHeight:100};
 const api=runInNewContext(source.slice(start,end)+'\n({stop,visibleQuestion,track:(run,index,at)=>{tracked=run;lastIndex=index;lastAt=at}})',ctx);
 return {...api,picker};
}
test('visible pacing accepts only canonical question indices in the current run',()=>{
 const h=harness(),run={questions:[{},{}]};
 for(const value of ['', ' ', '0x1','1.0','-1','2']){h.picker.value=value;assert.equal(h.visibleQuestion(run),null)}
 h.picker.value='1';assert.equal(h.visibleQuestion(run),1);
});
test('pacing repairs malformed containers and never incorporates infinite or string durations',()=>{
 const h=harness(),a={questions:[{}],pacing:{seconds:{0:Infinity}}};
 h.track(a,0,1000);h.stop(3000);assert.equal(a.pacing.seconds[0],2);
 const b={questions:[{}],pacing:{seconds:null}};h.track(b,0,1000);h.stop(3000);assert.equal(b.pacing.seconds[0],2);
 h.track(b,9,1000);h.stop(3000);assert.equal(b.pacing.seconds[9],undefined);
});
test('deadline clipping does not move the sampling anchor backward or duplicate elapsed time',()=>{
 const h=harness(),run={questions:[{}],deadline:3000};
 h.track(run,0,1000);h.stop(5000);assert.equal(run.pacing.seconds[0],2);
 h.stop(6000);assert.equal(run.pacing.seconds[0],2);
 run.deadline=10000;h.stop(7000);assert.equal(run.pacing.seconds[0],3);
});
test('debrief excludes malformed timing entries and classifies out-of-range choices as unanswered',()=>{
 const helper=source.slice(source.indexOf(' const positiveSeconds='),source.indexOf(' function currentRun()'));
 const choices=source.slice(source.indexOf(' const validChoice='),source.indexOf(' const positiveSeconds='));
 const timing=source.slice(source.indexOf(' function duration('),source.indexOf(' function analysisSlot('));
 const debrief=source.slice(source.indexOf(' function debriefMock('),source.indexOf(' const beforeDebriefSet='));
 const api=runInNewContext(helper+choices+timing+debrief+'\n({pacingHTML,debriefMock})',{topicForQuestion:()=>null,storeOptions:()=>({}),esc:String});
 const run={questions:[{id:'q',options:['a','b'],answer:0}],answers:{0:5},pacing:{seconds:{0:Infinity,'00':20}}};
 assert.match(api.pacingHTML(run,1,[false]),/not recorded/);
 assert.match(api.debriefMock(run),/0 wrong · 1 unanswered/);
});
test('missed-question retry and original debrief preserve current scope and original indices',()=>{
 assert.match(source,/globalThis.reviewStudyItemVisible\?\.\(q\)!==false/);
 assert.match(source,/if\(typeof savePracticeDraft==='function'\)savePracticeDraft\(\)/);
 assert.match(source,/answers=originalRun.ids.map\(\(id,i\)/);
});
