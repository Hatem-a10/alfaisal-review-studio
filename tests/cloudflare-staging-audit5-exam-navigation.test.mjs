import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8');
const baseTick="function etTick(){etTrackClassic();if(etExam&&!etExam.finishedAt&&!etExam.cheatMode&&Number.isFinite(etExam.pausedAt)){ExamEngine.setPaused(etExam,false);if(etExam.xp)etExam.xp.showAnswer=false;etSaveExam()}if(etExam&&!etExam.finishedAt&&ExamEngine.remaining(etExam)===0){etFinishExam('expired');return}etReconcileExam();const seconds=etExam&&!etExam.finishedAt?ExamEngine.remaining(etExam):0,countdown=$('#etCountdown');if(countdown){countdown.textContent=etTime(seconds);countdown.classList.toggle('et-time-low',seconds<=300)}let dock=$('#etExamDock');if(!dock){dock=document.createElement('div');dock.id='etExamDock';document.body.appendChild(dock)}dock.hidden=!etExam||!!etExam.finishedAt||view==='practice'&&etPracticeTab==='mock';if(!dock.hidden)dock.innerHTML=`<strong>Mock exam · ${etTime(seconds)}</strong><button id=\"etResumeMock\">Resume exam</button>`}",baseNav="function etNavigator(){return etExam.questions.map((q,i)=>`<button type=\"button\" data-et-jump=\"${i}\" class=\"${Number.isInteger(etExam.answers[i])?'answered':''} ${etExam.flags[i]?'flagged':''}\" aria-label=\"Question ${i+1}${Number.isInteger(etExam.answers[i])?', answered':', unanswered'}${etExam.flags[i]?', flagged':''}\">${i+1}${etExam.flags[i]?' ⚑':''}</button>`).join('')}",time="function etTime(seconds){return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}";
const get=n=>source.split('\n').find(l=>l.startsWith('function '+n+'('));
function fixture(candidate){
 const etExam={questions:Array.from({length:200},(_,i)=>({id:'q'+i})),answers:{},flags:{}},view='dashboard';
 let writes=0,remaining=300,finished=0,tracking=0,reconciled=0;
 const make=(classes='',label='',text='')=>({className:classes,label,textContent:text,getAttribute(){return this.label},setAttribute(k,v){this.label=v}});
 let buttons=[];
 const nav={querySelector(s){const m=s.match(/data-et-jump="(\d+)"/);return m?buttons[+m[1]]:null},set innerHTML(markup){writes++;buttons=Array.from(markup.matchAll(/data-et-jump="(\d+)" class="([^"]*)" aria-label="([^"]*)">([^<]*)<\/button>/g),m=>make(m[2],m[3],m[4]))},get innerHTML(){return buttons.map((b,i)=>'<button type="button" data-et-jump="'+i+'" class="'+b.className+'" aria-label="'+b.label+'">'+b.textContent+'</button>').join('')}};
 let strong=null,resume=null,dockWrites=0;
 const dock={hidden:false,querySelector(s){return s==='strong'?strong:resume},set innerHTML(s){dockWrites++;strong=make('','',s.match(/<strong>([^<]*)/)[1]);resume={id:'etResumeMock'}},get innerHTML(){return strong?'<strong>'+strong.textContent+'</strong><button id="etResumeMock">Resume exam</button>':''}};
 const countdown={textContent:'',classList:{toggle(){}}};
 const context=vm.createContext({etExam,view,etPracticeTab:'mock',$:s=>({'#etNavigator':nav,'#etCountdown':countdown,'#etExamDock':dock}[s]),ExamEngine:{remaining:()=>remaining,setPaused:e=>delete e.pausedAt},etTrackClassic:()=>tracking++,etFinishExam:()=>{finished++;etExam.finishedAt='now'},etReconcileExam:()=>reconciled++,etSaveExam:()=>{},document:{}});
 vm.runInContext(time+'\n'+baseNav+'\n'+(candidate?get('etUpdateNavigator'): "function etUpdateNavigator(){const n=$('#etNavigator');if(n)n.innerHTML=etNavigator()}")+'\n'+(candidate?get('etTick'):baseTick)+'\nthis.api={etUpdateNavigator,etTick,etNavigator}',context);
 nav.innerHTML=context.api.etNavigator();return {etExam,nav,dock,countdown,api:context.api,buttons:()=>buttons,counts:()=>({writes,dockWrites,finished,tracking,reconciled}),setRemaining:v=>remaining=v};
}
test('A5-157 classic exam navigator updates one cell and keeps other nodes',()=>{
 const a=fixture(false),b=fixture(true),first=b.buttons()[0];
 for(let i=1;i<100;i++){for(const x of [a,b]){x.etExam.flags[i]=true;x.etExam.answers[i]=i%4;x.api.etUpdateNavigator(i)}assert.equal(b.nav.innerHTML,a.nav.innerHTML);assert.equal(b.buttons()[0],first)}
 assert.equal(a.counts().writes,100);assert.equal(b.counts().writes,1);
 console.log(JSON.stringify({label:'A5-157 classic navigator DOM rebuilds',baseline:a.counts().writes,candidate:b.counts().writes,cells:200}));
});
test('A5-159 classic exam timer preserves dock button across ticks and expiration',()=>{
 const a=fixture(false),b=fixture(true);a.api.etTick();b.api.etTick();const button=b.dock.querySelector('#etResumeMock');
 for(const seconds of [300,299,299,298,1,0]){for(const x of [a,b]){x.setRemaining(seconds);x.api.etTick()}assert.equal(b.dock.innerHTML,a.dock.innerHTML);assert.equal(b.countdown.textContent,a.countdown.textContent);assert.equal(b.dock.querySelector('#etResumeMock'),button)}
 assert.equal(b.counts().finished,1);assert.equal(b.counts().tracking,a.counts().tracking);assert.equal(b.counts().reconciled,a.counts().reconciled);assert.equal(b.counts().dockWrites,1);
 console.log(JSON.stringify({label:'A5-159 resume dock rebuilds',baseline:a.counts().dockWrites,candidate:b.counts().dockWrites}));
});
