import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const candidate=readFileSync(new URL('../public/group-schedule-core.js',import.meta.url),'utf8');
const currentOfficial="const official=catalogGroup(array(catalog?.events),p.group).filter(e=>timed(e)&&assignedProfile(e,p)&&(!e.shared||shared));";
const originalOfficial="const official=array(catalog?.events).filter(e=>timed(e)&&assignedProfile(e,p)&&(!e.shared||shared));";
const currentEnglish="const three=settings?.englishFrequency===3,time=settings?.englishStartTime==='17:00'?1020:1050;\n  return englishDates(start,three).map(date=>({id:'personal-english-'+date,date,title:'English',start:time,end:time+60,kind:'english',custom:true,source:'Personal English preference',detail:three?'Sunday, Tuesday & Thursday':'Monday & Wednesday'}));";
const originalEnglish="const days=settings?.englishFrequency===3?[0,2,4]:[1,3],time=settings?.englishStartTime==='17:00'?1020:1050;\n  return days.map(offset=>{const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);const date=d.toISOString().slice(0,10);return {id:'personal-english-'+date,date,title:'English',start:time,end:time+60,kind:'english',custom:true,source:'Personal English preference',detail:settings?.englishFrequency===3?'Sunday, Tuesday & Thursday':'Monday & Wednesday'}});";
assert.ok(candidate.includes(currentOfficial)&&candidate.includes(currentEnglish),'known candidate source anchors');
const baseline=candidate.replace(currentOfficial,originalOfficial).replace(currentEnglish,originalEnglish);
const make=(source,DateClass=Date)=>vm.runInNewContext(source+';GroupSchedules',{Date:DateClass,Map,WeakMap,Set,Array,Object,Number,RegExp,JSON,Math});
const p=(group='M1',section='A',lab='1.6',frequency=2)=>({studentGroup:group,studentSection:section,labGroup:lab,englishFrequency:frequency,englishStartTime:'17:00'});
const e=(id,group='M1',date='2026-11-24',start=650)=>({id,studentGroups:[group],studentSection:'A',date,start,end:start+40,source:'Renal Schedule.pdf',title:'A1',course:'REN',kind:'anatomy'});
test('A5-122 group index preserves exactly the legacy selection for each group, week, and shared toggle',()=>{
 const a=make(baseline),b=make(candidate),rows=[e('m1'),e('m2','M2'),e('f1','F1'),e('f2','F2'),{...e('mixed'),studentGroups:['M1','M2','M1'],shared:true},{...e('lab'),labGroups:['1.6'],kind:'lab'},null,{...e('old'),date:'2026-11-10'},{...e('invalid'),studentGroups:'M1'}];
 const catalog={events:rows},legacy=[{...e('legacy'),source:'Legacy'}];
 for(const week of ['2026-11-22','2026-11-29'])for(const group of ['M1','M2','F1','F2',''])for(const shared of [false,true]){
  const settings=p(group);
  assert.equal(JSON.stringify(b.selected(week,settings,catalog,legacy,shared)),JSON.stringify(a.selected(week,settings,catalog,legacy,shared)),JSON.stringify({week,group,shared}));
 }
 rows.push(e('new-member'));assert.equal(JSON.stringify(b.selected('2026-11-22',p(),catalog,legacy)),JSON.stringify(a.selected('2026-11-22',p(),catalog,legacy)));
 const replacement={events:[e('changed','M1')]};
 assert.equal(JSON.stringify(b.selected('2026-11-22',p(),replacement,legacy)),JSON.stringify(a.selected('2026-11-22',p(),replacement,legacy)));
});
test('A5-122 indexing removes repeated unrelated-group membership lookups',()=>{
 let beforeReads=0,afterReads=0;
 const create=(count)=>Array.from({length:1600},(_,i)=>({id:'event'+i,studentSection:'A',date:'2026-11-24',start:600,end:650,kind:'anatomy',course:'REN',title:'A1',get studentGroups(){count();return [[ 'M1'],['M2'],['F1'],['F2']][i%4]}}));
 const a=make(baseline),b=make(candidate),ca={events:create(()=>beforeReads++)},cb={events:create(()=>afterReads++)};
 for(let i=0;i<50;i++){a.selected('2026-11-22',p(),ca,[]);b.selected('2026-11-22',p(),cb,[])}
 assert.ok(afterReads<beforeReads/2,JSON.stringify({beforeReads,afterReads}));
 console.log(JSON.stringify({label:'A5-122 group-index repeated 1600-row timetable selection',queries:50,beforeMembershipReads:beforeReads,afterMembershipReads:afterReads}));
});
test('A5-124 recurring English dates and personalized event objects remain equivalent',()=>{
 const a=make(baseline),b=make(candidate);
 for(const start of ['2026-11-22','2026-12-06','2028-02-27','bad'])for(const freq of [2,3,0])for(const hour of ['17:00','17:30'])for(const enabled of [true,false]){
  const options={...p('M1','A','1.6',freq),englishStartTime:hour,englishEnabled:enabled};
  assert.equal(JSON.stringify(b.english(start,options)),JSON.stringify(a.english(start,options)),JSON.stringify({start,freq,hour,enabled}));
  assert.notEqual(b.english(start,options),b.english(start,options));
 }
});
test('A5-124 bounded date expansion avoids recreating unchanged week dates',()=>{
 let before=0,after=0;
 class BeforeDate extends Date{constructor(...args){super(...args);before++}}
 class AfterDate extends Date{constructor(...args){super(...args);after++}}
 const a=make(baseline,BeforeDate),b=make(candidate,AfterDate),options=p();
 for(let i=0;i<200;i++){a.english('2026-11-22',options);b.english('2026-11-22',options)}
 assert.ok(after<before/2,JSON.stringify({before,after}));
 console.log(JSON.stringify({label:'A5-124 recurring English calendar date construction',runs:200,beforeConstructors:before,afterConstructors:after}));
});
