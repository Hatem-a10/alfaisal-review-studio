import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const oldBoard="function campusBoard(start){const allDays=Array.from({length:5},(_,i)=>add(start,i)),compact=matchMedia('(max-width:700px)').matches&&!scheduleMobileWeek,days=compact?[allDays.includes(day)?day:start]:allDays,events=campusWeekEvents(start),{min,max}=campusTimeBounds(events,scheduleShared,settings.englishEnabled!==false),layout=campusLayout(events),scale=1.05,height=(max-min)*scale,hours=Array.from({length:(max-min)/60+1},(_,i)=>min+i*60);return `${matchMedia('(max-width:700px)').matches?`<div class=\"schedule-mobile-picker\"><div>${allDays.map((date,i)=>`<button data-day=\"${date}\" aria-pressed=\"${date===days[0]}\">${['Sun','Mon','Tue','Wed','Thu'][i]}<b>${Number(date.slice(-2))}</b></button>`).join('')}</div><button id=\"scheduleMobileView\">${scheduleMobileWeek?'Day view':'Full week'}</button></div>`:''}<p class=\"schedule-swipe-hint\" ${compact?'hidden':''}>Swipe across to see all five days.</p><div class=\"schedule-scroll\"><div class=\"campus-board ${compact?'campus-mobile-day':''}\" style=\"--campus-height:${height}px;--hour-height:${60*scale}px\"><div class=\"campus-time-head\">TIME</div>${days.map((date,i)=>`<button class=\"campus-day-head ${date===day?'day-current':''}\" data-day=\"${date}\"><strong>${['Sunday','Monday','Tuesday','Wednesday','Thursday'][new Date(date+'T12:00:00Z').getUTCDay()]}</strong><span>${new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</span><small>${tasks().filter(t=>t.date===date&&!t.done).length} reviews due</small></button>`).join('')}<div class=\"campus-time-axis\" style=\"height:${height}px\">${hours.map(n=>`<span style=\"top:${(n-min)*scale}px\">${campusTime(n)}</span>`).join('')}</div>${days.map(date=>`<div class=\"campus-day-column ${date===day?'column-current':''}\" style=\"height:${height}px\">${events.filter(e=>e.date===date&&e.start<max&&e.end>min).map(e=>{const label=campusEventTitle(e),top=(Math.max(e.start,min)-min)*scale,h=Math.max(1,(Math.min(e.end,max)-Math.max(e.start,min))*scale-5);return `<button type=\"button\" class=\"campus-event campus-${e.kind}\" style=\"top:${top}px;height:${h}px;${campusPersonalOverlap(e,layout)}\" data-campus-event=\"${esc(e.id)}\" aria-label=\"${esc(label.title)}, ${fmt(e.date)}, ${campusTime(e.start)} to ${campusTime(e.end)}\"><strong>${esc(label.title)}</strong>${campusDoctor(e)&&h>38?`<span class=\"campus-doctor\">${esc(campusDoctor(e))}</span>`:''}${h>95&&label.detail?`<span>${esc(label.detail)}</span>`:''}${h>65?`<small>${campusTime(e.start)}–${campusTime(e.end)}</small>`:''}</button>`}).join('')}</div>`).join('')}</div></div>`}";
const oldPaint=" function paint(){const c=assessmentClock();clock.textContent=HubDomain.timeLabel();clock.dateTime=new Date().toISOString();if(lastDate!==c.date){if(!manualDate){day=c.date;$('#day').value=day;lastDate=c.date;render();return}lastDate=c.date}$('#day').classList.toggle('is-today',day===c.date);const campusElements=document.querySelectorAll('[data-campus-event]'),campusById=campusElements.length?new Map(campusWeekEvents(campusWeekStart(c.date),true).map(v=>[v.id,v])):new Map();campusElements.forEach(el=>{const v=campusById.get(el.dataset.campusEvent),active=HubDomain.active(v,c.date,c.minute);el.classList.toggle('period-live',active);if(active)el.setAttribute('aria-current','time');else el.removeAttribute('aria-current')});const countdownElements=document.querySelectorAll('[data-live-countdown]'),assessmentById=countdownElements.length?new Map(allAssessments().map(e=>[e.id,e])):new Map();countdownElements.forEach(el=>{const e=assessmentById.get(el.dataset.liveCountdown);if(e){const t=HubDomain.countdown(e);el.innerHTML=t.known?countdownDigits(t):'';el.closest('.countdown-card')?.classList.toggle('event-past',!!t.past)}})}";
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
  assert.equal(b.run(),a.run());
  assert.equal(b.counts().taskCalls,1);assert.equal(a.counts().taskCalls,mobile&&!week?1:5);
  if(!mobile){const baseline=a.counts(),after=b.counts();assert.ok(after.eventReads<baseline.eventReads);console.log(JSON.stringify({label:'A5-121/A5-131 timetable board',baselineMedianMs:median(a.run),candidateMedianMs:median(b.run),baseline,after}))}
 }
});
function painter(src){
 let writes=0,second=10,active=true;
 const make=id=>{let html='';return {dataset:{liveCountdown:id},get innerHTML(){return html},set innerHTML(value){writes++;html=value},closest:()=>({classList:{toggle(){}}})}};
 const els=[make('past'),make('future'),make('unknown')];
 const ctx=vm.createContext({clock:{},lastDate:start,day:start,manualDate:false,assessmentClock:()=>({date:start,minute:0}),HubDomain:{timeLabel:()=>'',countdown:e=>({known:e.id!=='unknown',text:e.id==='past'?'00':String(second),past:e.id==='past'}),active:()=>active},$:()=>({classList:{toggle(){}}}),document:{querySelectorAll:q=>q.includes('countdown')?els:[]},allAssessments:()=>els.map(el=>({id:el.dataset.liveCountdown})),countdownDigits:t=>'<span>'+t.text+'</span>'});
 vm.runInContext(src+';this.run=paint',ctx);
 return {run:()=>ctx.run(),advance:()=>second++,writes:()=>writes,html:()=>els.map(e=>e.innerHTML)};
}
test('A5-137 unchanged countdown digits skip DOM writes without stale values',()=>{
 const a=painter(oldPaint),b=painter(source('hub-upgrade.js','paint'));
 for(let i=0;i<20;i++){if(i%3===0){a.advance();b.advance()}a.run();b.run();assert.deepEqual(b.html(),a.html())}
 assert.equal(a.writes(),60);assert.equal(b.writes(),8);
 console.log(JSON.stringify({label:'A5-137 countdown DOM assignments',baselineWrites:a.writes(),candidateWrites:b.writes(),ticks:20}));
});
