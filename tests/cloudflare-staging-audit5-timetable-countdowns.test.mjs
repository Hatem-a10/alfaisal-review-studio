import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const oldBoard="function campusBoard(start){const allDays=Array.from({length:5},(_,i)=>add(start,i)),compact=matchMedia('(max-width:700px)').matches&&!scheduleMobileWeek,days=compact?[allDays.includes(day)?day:start]:allDays,events=campusWeekEvents(start),{min,max}=campusTimeBounds(events,scheduleShared,settings.englishEnabled!==false),layout=campusLayout(events),scale=1.05,height=(max-min)*scale,hours=Array.from({length:(max-min)/60+1},(_,i)=>min+i*60);return `${matchMedia('(max-width:700px)').matches?`<div class=\"schedule-mobile-picker\"><div>${allDays.map((date,i)=>`<button data-day=\"${date}\" aria-pressed=\"${date===days[0]}\">${['Sun','Mon','Tue','Wed','Thu'][i]}<b>${Number(date.slice(-2))}</b></button>`).join('')}</div><button id=\"scheduleMobileView\">${scheduleMobileWeek?'Day view':'Full week'}</button></div>`:''}<p class=\"schedule-swipe-hint\" ${compact?'hidden':''}>Swipe across to see all five days.</p><div class=\"schedule-scroll\"><div class=\"campus-board ${compact?'campus-mobile-day':''}\" style=\"--campus-height:${height}px;--hour-height:${60*scale}px\"><div class=\"campus-time-head\">TIME</div>${days.map((date,i)=>`<button class=\"campus-day-head ${date===day?'day-current':''}\" data-day=\"${date}\"><strong>${['Sunday','Monday','Tuesday','Wednesday','Thursday'][new Date(date+'T12:00:00Z').getUTCDay()]}</strong><span>${new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</span><small>${tasks().filter(t=>t.date===date&&!t.done).length} reviews due</small></button>`).join('')}<div class=\"campus-time-axis\" style=\"height:${height}px\">${hours.map(n=>`<span style=\"top:${(n-min)*scale}px\">${campusTime(n)}</span>`).join('')}</div>${days.map(date=>`<div class=\"campus-day-column ${date===day?'column-current':''}\" style=\"height:${height}px\">${events.filter(e=>e.date===date&&e.start<max&&e.end>min).map(e=>{const label=campusEventTitle(e),top=(Math.max(e.start,min)-min)*scale,h=Math.max(1,(Math.min(e.end,max)-Math.max(e.start,min))*scale-5);return `<button type=\"button\" class=\"campus-event campus-${e.kind}\" style=\"top:${top}px;height:${h}px;${campusPersonalOverlap(e,layout)}\" data-campus-event=\"${esc(e.id)}\" aria-label=\"${esc(label.title)}, ${fmt(e.date)}, ${campusTime(e.start)} to ${campusTime(e.end)}\"><strong>${esc(label.title)}</strong>${campusDoctor(e)&&h>38?`<span class=\"campus-doctor\">${esc(campusDoctor(e))}</span>`:''}${h>95&&label.detail?`<span>${esc(label.detail)}</span>`:''}${h>65?`<small>${campusTime(e.start)}–${campusTime(e.end)}</small>`:''}</button>`}).join('')}</div>`).join('')}</div></div>`}";
const source=(file,name)=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8').split('\n').find(l=>l.trim().startsWith('function '+name+'('));
const add=(date,i)=>new Date(Date.parse(date+'T12:00:00Z')+i*86400000).toISOString().slice(0,10);
const start='2026-11-22';
function board(source,mobile,week){
 let taskCalls=0,eventReads=0;
 const events=Array.from({length:600},(_,i)=>({id:'e'+i,get date(){eventReads++;return add(start,i%7)},start:i%17===0?NaN:480+i%8*60,end:540+i%8*60,kind:'lab',title:'Event '+i,detail:'Detail '+i}));
 const rows=Array.from({length:4000},(_,i)=>({date:add(start,i%10),done:i%3===0}));
 const ctx=vm.createContext({add,matchMedia:()=>({matches:mobile}),scheduleMobileWeek:week,day:add(start,2),campusWeekEvents:()=>events,campusTimeBounds:()=>({min:480,max:1020}),scheduleShared:false,settings:{},campusLayout:()=>new Map(),campusTime:String,tasks:()=>{taskCalls++;return rows},campusEventTitle:e=>e,campusPersonalOverlap:()=>'',esc:String,fmt:String,campusDoctor:()=>''});
 vm.runInContext(source+';this.run=campusBoard',ctx);
 return {run:()=>ctx.run(start),counts:()=>({taskCalls,eventReads})};
}
function median(fn){fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]}
test('A5-121/A5-131 timetable groups preserve exact markup across viewport modes',()=>{
 const candidate=source('schedule-ui.js','campusBoard');
 for(const [mobile,week] of [[false,false],[true,false],[true,true]]){
  const a=board(oldBoard,mobile,week),b=board(candidate,mobile,week);
  const actual=b.run();assert.equal(actual.replace(/<div class="schedule-mobile-agenda [^"]*"[\s\S]*?<\/div>$/,''),a.run());
  assert.match(actual,mobile&&!week?/schedule-mobile-agenda schedule-agenda-primary/:/schedule-mobile-agenda "/);
  assert.equal(b.counts().taskCalls,1);assert.equal(a.counts().taskCalls,mobile&&!week?1:5);
  if(!mobile){const baseline=a.counts(),after=b.counts();assert.ok(after.eventReads<baseline.eventReads);console.log(JSON.stringify({label:'A5-121/A5-131 timetable board',baselineMedianMs:median(a.run),candidateMedianMs:median(b.run),baseline,after}))}
 }
});
test('countdown ticks update only changed digits, track elapsed time and avoid catalogue scans',()=>{
 let now=10000,writes=0;
 const units=Array.from({length:4},()=>{let text='';return {get textContent(){return text},set textContent(value){text=value;writes++}}});
 const direction={hidden:true},card={classList:{toggle(){}},querySelector:()=>direction};
 const target={dataset:{countdownTarget:'11000'},querySelectorAll:()=>units,closest:()=>card};
 class TestDate extends Date{static now(){return now}}
 const ctx=vm.createContext({Date:TestDate,clock:{},lastDate:start,day:start,manualDate:false,assessmentClock:()=>({date:start,minute:0}),
  HubDomain:{timeLabel:()=>'',active:()=>false},$:()=>({classList:{toggle(){}}}),document:{querySelectorAll:q=>q==='[data-countdown-target]'?[target]:[]},
  allAssessments(){assert.fail('tick must not read assessment catalogue')}
 });
 const runtime=readFileSync(new URL('../public/hub-upgrade.js',import.meta.url),'utf8');
 vm.runInContext(runtime.slice(runtime.indexOf(' function paint()'),runtime.indexOf(" document.addEventListener('change'"))+';this.run=paint',ctx);
 ctx.run();assert.deepEqual(units.map(node=>node.textContent),['00','00','00','01']);assert.equal(direction.hidden,true);
 ctx.run();assert.equal(writes,4);
 now=13000;ctx.run();assert.equal(direction.hidden,false);assert.equal(units[3].textContent,'02');assert.equal(writes,5);
});
