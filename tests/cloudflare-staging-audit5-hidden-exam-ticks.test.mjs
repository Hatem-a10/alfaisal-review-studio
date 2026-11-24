import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const baseline="function etTick(){etTrackClassic();if(etExam&&!etExam.finishedAt&&!etExam.cheatMode&&Number.isFinite(etExam.pausedAt)){ExamEngine.setPaused(etExam,false);if(etExam.xp)etExam.xp.showAnswer=false;etSaveExam()}if(etExam&&!etExam.finishedAt&&ExamEngine.remaining(etExam)===0){etFinishExam('expired');return}etReconcileExam();const seconds=etExam&&!etExam.finishedAt?ExamEngine.remaining(etExam):0,countdown=$('#etCountdown');if(countdown){const label=etTime(seconds);if(countdown.textContent!==label)countdown.textContent=label;countdown.classList.toggle('et-time-low',seconds<=300)}let dock=$('#etExamDock');if(!dock){dock=document.createElement('div');dock.id='etExamDock';document.body.appendChild(dock)}dock.hidden=!etExam||!!etExam.finishedAt||view==='practice'&&etPracticeTab==='mock';if(!dock.hidden){const label='Mock exam · '+etTime(seconds),strong=dock.querySelector('strong'),resume=dock.querySelector('#etResumeMock');if(strong&&resume){if(strong.textContent!==label)strong.textContent=label}else dock.innerHTML=`<strong>${label}</strong><button id=\"etResumeMock\">Resume exam</button>`}}";
const candidate=readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8').split('\n').find(l=>l.startsWith('function etTick('));
function fixture(src){
 let tracked=0,reconciled=0,finished=0,writing=0,seconds=365,hidden=true;
 const exam={questions:[{id:'q1'}],answers:{},flags:{}};
 const countdown={_text:'',set textContent(x){writing++;this._text=x},get textContent(){return this._text},classList:{toggle(){}}};
 let html='';const dock={_hidden:false,querySelector:s=>null,set innerHTML(x){writing++;html=x},get innerHTML(){return html},set hidden(v){this._hidden=v},get hidden(){return this._hidden}};
 const doc={get hidden(){return hidden},body:{appendChild(){}},createElement:()=>dock};
 const context=vm.createContext({document:doc,etExam:exam,view:'practice',etPracticeTab:'sets',$:s=>({'#etCountdown':countdown,'#etExamDock':dock}[s]),etTrackClassic:()=>tracked++,etReconcileExam:()=>reconciled++,etFinishExam:()=>{finished++;exam.finishedAt='now'},etSaveExam:()=>{},ExamEngine:{remaining:()=>seconds,setPaused(){}} ,etTime:n=>String(n)});
 vm.runInContext(src+'\nthis.tick=etTick',context);
 return {tick:()=>context.tick(),setSeconds:v=>seconds=v,setHidden:v=>hidden=v,counts:()=>({tracked,reconciled,finished,writing}),state:()=>({text:countdown._text,html,dockHidden:dock.hidden})};
}
test('A5-040 hidden classic exam ticks still track elapsed time and reconcile storage',()=>{
 const a=fixture(baseline),b=fixture(candidate);
 for(let i=0;i<200;i++){a.tick();b.tick()}
 assert.deepEqual({...b.counts(),writing:0},{...a.counts(),writing:0});
 assert.ok(a.counts().writing>0);
 assert.equal(b.counts().writing,0);
 for(const f of [a,b])f.setHidden(false);
 for(const seconds of [290,289]){a.setSeconds(seconds);b.setSeconds(seconds);a.tick();b.tick();assert.deepEqual(b.state(),a.state())}
 assert.deepEqual({...b.counts(),writing:0},{...a.counts(),writing:0});
 console.log(JSON.stringify({label:'A5-040 hidden exam DOM writes',baselineWrites:a.counts().writing,candidateWrites:b.counts().writing,hiddenTicks:200}));
});
test('A5-040 expiration and persistence still run while tab hidden',()=>{
 const a=fixture(baseline),b=fixture(candidate);a.setSeconds(0);b.setSeconds(0);a.tick();b.tick();assert.deepEqual(b.counts(),a.counts());assert.equal(b.counts().finished,1);
});
