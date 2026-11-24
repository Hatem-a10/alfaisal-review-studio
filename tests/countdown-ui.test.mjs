import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync('public/'+f,'utf8'),api=vm.runInNewContext(read('hub-domain.js')+';HubDomain');
const events=[{id:'p',date:'2099-01-01',title:'CVP OSPE',kind:'ospe'},{id:'e',date:'2099-01-02',title:'CVP Final',kind:'final'},{id:'t',date:'2099-01-03',title:'MOL TBL 3',kind:'tbl'},{id:'s',date:'2099-01-04',title:'REN begins',type:'Course start'}];
test('countdown filters exclude practicals and isolate each supported category',()=>{
 assert.deepEqual([...api.filterCountdowns(events).map(e=>e.id)],['e','t','s']);for(const [filter,id] of [['exams','e'],['tbls','t'],['starts','s']])assert.deepEqual([...api.filterCountdowns(events,filter).map(e=>e.id)],[id]);assert.equal(api.countdownCategory({title:'Renal OSPE',type:'Official practical exam'}),'ospe');assert.equal(api.countdownCategory({title:'MOL Midterm'}),'exams');
});
test('each filtered view promotes its nearest event and preserves accessible category controls',()=>{
 const s=read('hub-upgrade.js'),fragment=s.slice(s.indexOf(' function countdownDigits('),s.indexOf(' function activityPage('));
 for(const [filter,expected] of [['all','CVP Final'],['exams','CVP Final'],['tbls','MOL TBL 3'],['starts','REN begins']]){
  const ctx={HubDomain:api,allAssessments:()=>events,esc:String,fullDate:String,intro:()=>'',featureIcon:()=>'',ACADEMIC_IMPORT:{notes:[]},localStorage:{getItem:()=>filter},document:{addEventListener(){}}};const html=vm.runInNewContext(fragment+';countdownPage()',ctx);assert.ok(!html.includes('CVP OSPE'));assert.equal((html.match(/countdown-featured/g)||[]).length,1);assert.match(html,new RegExp('countdown-featured[\\s\\S]*?<h2>'+expected));assert.ok(html.includes('data-countdown-filter="'+filter+'" aria-pressed="true"'));
 }
});
test('dashboard agenda hides prayer/lunch without removing events from schedule data',()=>{
 const src=read('studio-redesign.js'),fragment=src.slice(src.indexOf(' function homeDaySchedule('),src.indexOf(' function nextLesson()')),list=[{id:'l',date:'2026-11-05',title:'Prayer and Lunch',start:720,kind:'break'},{id:'c',date:'2026-11-05',title:'CVP P20',start:660,kind:'physiology'}],before=JSON.stringify(list),ctx={day:'2026-11-05',campusWeekEvents:()=>list,campusWeekStart:x=>x,DATA:{events:[]},esc:String,fmt:String,campusTime:String,campusEventTitle:e=>({title:e.title}),campusCategoryLabel:String};const html=vm.runInNewContext(fragment+';homeDaySchedule()',ctx);assert.ok(!html.includes('Prayer and Lunch'));assert.ok(html.includes('CVP P20'));assert.equal(JSON.stringify(list),before);
});
