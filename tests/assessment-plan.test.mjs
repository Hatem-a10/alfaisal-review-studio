import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{runInNewContext}from'node:vm';
import {finalCatchup} from '../public/final-catchup.mjs';
const context={structuredClone,Intl,Date};runInNewContext(readFileSync(new URL('../public/data.js',import.meta.url),'utf8')+readFileSync(new URL('../public/assessment-plan.js',import.meta.url),'utf8')+';this.data=DATA;this.api=AssessmentPlan;',context);const {data,api}=context,day='2026-11-03';
test('priorities use documented ranges, label inferred recent CVP groups and expire after actual event end',()=>{const list=api.catalog(data.events,data.items),mol=list.find(a=>a.course==='MOL'&&a.number===2);assert.equal(mol.endMinute,600);assert.deepEqual([...mol.lectureIds],['MOL-14','MOL-15','MOL-16','MOL-17','MOL-18','MOL-19']);assert.equal(mol.scopeKind,'documented');assert.equal(list.filter(a=>a.course==='MOL'&&a.number===2).length,1);assert.ok(api.nextByCourse(data.events,data.items,day,550).some(a=>a.label==='MOL TBL 2'));const now=api.nextByCourse(data.events,data.items,day,720);assert.ok(!now.some(a=>a.label==='MOL TBL 2'));assert.ok(now.some(a=>a.label==='CVP TBL 5'));const cvp=now.find(a=>a.course==='CVP');assert.equal(cvp.scopeKind,'suggested');assert.ok(cvp.lectureIds.includes('CVP-P23'));assert.ok(!cvp.lectureIds.includes('CVP-P1'));assert.match(cvp.scopeNote,/not confirmed/);assert.equal(api.nextByCourse(data.events,data.items,'2026-11-09',0).find(a=>a.course==='CVP').label,'CVP TBL 6');assert.equal(api.nextByCourse(data.events,data.items,'2026-11-25',0).find(a=>a.course==='MOL').label,'MOL Final Exam');assert.equal(api.nextByCourse(data.events,data.items,'2026-12-21',0).length,0)});
test('full personal plan spreads both courses, obeys budget and course caps, preserves completions and official events',()=>{const records={'MOL-1':{done:{0:'2026-11-01T09:00:00Z',1:'2026-11-02T09:00:00Z'},notes:'Keep me',learning:{results:{q:{ok:true}}}},'CVP-P1':{done:{0:'2026-11-01T10:00:00Z'}}},before=JSON.stringify({data,records}),p=api.spread(data.items,records,day,{budget:180},data.events,()=>false,()=>180,720),daily={},courses={},molDays=new Set();for(const x of data.items){const r=p.records[x.id]||records[x.id]||{};for(let pass=0;pass<3;pass++){if(r.done?.[pass]||pass===2&&r.skipThird)continue;if(p.unplaced.some(u=>u.id===x.id&&u.pass===pass))continue;const d=(r.dates||x.dates)[pass];assert.ok(d>=day,x.id);assert.ok(d>=api.release(x,data.events),x.id+' release');daily[d]=(daily[d]||0)+[40,30,20][pass];courses[d+':'+x.course]=(courses[d+':'+x.course]||0)+1;if(x.course==='MOL')molDays.add(d);if(pass>0&&!r.done?.[pass-1]){const prev=(r.dates||x.dates)[pass-1];assert.ok(Date.parse(d)-Date.parse(prev)>=(pass===1?2:4)*86400000,x.id+' spacing')}}}assert.ok(molDays.size>10);assert.ok(Object.values(daily).every(n=>n<=180));assert.ok(Object.values(courses).every(n=>n<=p.courseDailyCap));assert.equal(p.records['MOL-1'].done[0],records['MOL-1'].done[0]);assert.equal(p.records['MOL-1'].notes,'Keep me');assert.equal(JSON.stringify(p.records['MOL-1'].learning),JSON.stringify(records['MOL-1'].learning));assert.equal(JSON.stringify({data,records}),before);assert.ok(!p.changes.some(c=>c.field.startsWith('done')));assert.ok(p.late.every(x=>x.date>=x.assessment));});
test('MOL old midterm material targets final while MOL20–24 targets next TBL; zero capacity is honest',()=>{const list=api.catalog(data.events,data.items);assert.equal(api.target(data.items.find(x=>x.id==='MOL-2'),list,day,720).label,'MOL Final Exam');assert.equal(api.target(data.items.find(x=>x.id==='MOL-20'),list,day,720).label,'MOL TBL 3');const subset=data.items.filter(x=>['MOL-20','MOL-21'].includes(x.id)),p=api.spread(subset,{},day,{budget:30},data.events,()=>false,()=>0,720);assert.equal(p.changes.length,0);assert.equal(p.unplaced.length,6);assert.equal(Object.keys(p.records).length,0)});

test('learning priority UI filters recent topics and follows the next event without stale chips',()=>{let clock={date:day,minute:720};const listeners={},ctx={HubDomain:runInNewContext(readFileSync('public/hub-domain.js','utf8')+';HubDomain'),tasks:()=>[],state:{},DATA:data,AssessmentPlan:api,assessmentClock:()=>clock,Study:{gap:(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/86400000)},today:()=>clock.date,lessonCourse:'all',lessonSearch:'',lessonId:'MOL-1',cardIndex:0,guideTopic:0,guideTopicLesson:'MOL-1',customLesson:null,provisionalGuide:()=>null,learningStatus:()=>({passed:false,known:0,total:3}),esc:x=>String(x),title:x=>x.title,fmt:x=>x,render(){},setInterval(){},view:'learning',document:{addEventListener:(name,f)=>listeners[name]=f}};runInNewContext(readFileSync(new URL('../public/assessment-planning.js',import.meta.url),'utf8'),ctx);let html=ctx.lessonCatalog();assert.equal(ctx.lessonCourse,'today');assert.match(html,/<option value="today" selected>/);assert.match(html,/<option value="overdue"/);assert.match(html,/<optgroup label="CVP 112">/);assert.match(html,/<option value="priority:CVP"[^>]*>CVP TBL 5/);assert.ok(!html.includes('learning-priorities'));assert.ok(!html.includes('course-priority-dropdown'));assert.match(html,/MOL TBL 3/);assert.ok(!html.includes('MOL TBL 2'));ctx.lessonCourse='priority:CVP';html=ctx.lessonCatalog();assert.match(html,/not confirmed TBL coverage/);assert.ok(html.includes('data-lesson="CVP-P23"'));assert.ok(!html.includes('data-lesson="CVP-P1"'));clock={date:'2026-11-09',minute:720};html=ctx.lessonCatalog();assert.ok(!html.includes('CVP TBL 5'));assert.match(html,/CVP TBL 6/);assert.ok(html.includes('data-lesson="CVP-P26"'));clock={date:'2026-11-25',minute:720};html=ctx.lessonCatalog();assert.match(html,/MOL Final Exam/);assert.ok(!html.includes('CVP TBL 6'));});

test('CVP hard cutoff uses the source plan date and leaves overflow unscheduled',()=>{
 const final=api.cvpFinalDate(data.events);
 assert.equal(final,'2026-11-18');
 const cvp=data.items.filter(x=>x.course==='CVP').slice(0,8);
 const constrained=api.spread(cvp,{},'2026-11-17',{budget:90},data.events,()=>false,()=>90);
 assert.ok(constrained.changes.length>0);
 assert.ok(constrained.unplaced.length>0);
 assert.ok(constrained.changes.filter(c=>c.field.startsWith('dates.')).every(c=>c.after<final));
 assert.ok(constrained.changes.every(c=>c.field==='dates.0'));
 assert.equal(api.spread(cvp,{},final,{budget:180},data.events,()=>false,()=>180).changes.length,0);
 const study=runInNewContext(readFileSync('public/engine.js','utf8')+';Study',{AssessmentPlan:api});
 const overdue=[{...cvp[0],dates:['2026-11-16','2026-11-17','2026-11-18']}];
 assert.ok(study.daily(overdue,{},'2026-11-17',{budget:180},data.events).selected.length);
 assert.equal(study.daily(overdue,{},final,{budget:180},data.events).selected.length,0);
});

test('final catch-up assigns first passes before second passes and makes every third optional under pressure',()=>{
 const current='2026-11-15',final='2026-11-18';
 const items=['CVP-A1','CVP-A2','CVP-A3','CVP-A4','MOL-1'].map(id=>({id,course:id.split('-')[0],dates:['2026-11-01','2026-11-02','2026-11-03']}));
 const done={0:'2026-11-02T00:00:00Z',1:'2026-11-04T00:00:00Z'};
 const records={'CVP-A4':{done,difficult:true},'MOL-1':{dates:[current,'2026-11-20','2026-11-22']}};
 const before=JSON.stringify(records);
 const plan=finalCatchup(api,items,records,current,[{date:final,title:'CVP Final Exam'}],()=>80);
 assert.equal(JSON.stringify(records),before);
 assert.equal(plan.firstPlaced,3);
 assert.equal(plan.secondPlaced,2);
 assert.equal(plan.unplaced.length,1);
 assert.equal(plan.unplaced[0].pass,1);
 assert.ok(items.slice(0,4).every(x=>plan.records[x.id].skipThird));
 assert.equal(JSON.stringify(plan.records['CVP-A4'].done),JSON.stringify(done));
 assert.equal(JSON.stringify(plan.records['MOL-1']),JSON.stringify(records['MOL-1']));
 assert.ok(plan.changes.filter(c=>c.field.startsWith('dates.')).every(c=>c.after<final));
});

test('final catch-up uses spare slots for spaced third passes without changing completed work',()=>{
 const current='2026-11-15',final='2026-11-18';
 const x={id:'CVP-A1',course:'CVP',dates:['2026-11-01','2026-11-02','2026-11-03']};
 const done={0:'2026-11-12T00:00:00Z',1:'2026-11-13T22:00:00Z'};
 const plan=finalCatchup(api,[x],{[x.id]:{done,skipThird:true}},current,[{date:final,title:'CVP Final Exam'}],()=>90);
 assert.equal(plan.unplaced.length,0);
 assert.equal(plan.records[x.id].skipThird,false);
 assert.equal(plan.records[x.id].dates[2],'2026-11-16');
});

test('a large first-pass backlog switches to shorter sessions only when that improves coverage',()=>{
 const day='2026-11-08',final='2026-11-18';
 const items=Array.from({length:47},(_,i)=>({id:'CVP-P'+(i+1),course:'CVP',dates:['2026-11-01','2026-11-02','2026-11-03']}));
 const plan=finalCatchup(api,items,{},day,[{date:final,title:'CVP Final Exam'}],()=>180);
 assert.equal(plan.focused,true);
 assert.equal(plan.firstPlaced,47);
 assert.ok(plan.unplaced.every(x=>x.pass===1));
 assert.equal(plan.omitted.length,47);
 const daily={};
 for(const c of plan.changes.filter(c=>c.field.startsWith('dates.'))){
  const pass=+c.field.split('.')[1];daily[c.after]=(daily[c.after]||0)+[30,25,20][pass];assert.ok(c.after<final);
 }
 assert.ok(Object.values(daily).every(n=>n<=180));
});

test('startup and cloud restore keep legacy third reviews out of the overdue queue during the CVP final window',()=>{
 const current='2026-11-08',final='2026-11-18';
 const items=['CVP-A1','MOL-1','CVP-A2','CVP-A3','CVP-A4','CVP-A5'].map(id=>({
  id,course:id.split('-')[0],dates:['2026-11-01','2026-11-02','2026-11-03']
 }));
 const saved={records:{
  'CVP-A1':{skipThird:false},
  'MOL-1':{skipThird:true},
  'CVP-A2':{dates:['2026-11-01','2026-11-02',current],finalThirdDate:current},
  'CVP-A3':{finalThirdDate:'2026-11-03'},
  'CVP-A4':{done:{2:'2026-11-04T00:00:00Z'}},
  'CVP-A5':{dates:['2026-11-01','2026-11-17','2026-11-19']}
 }};
 const ctx={structuredClone,Intl,Date,AssessmentPlan:api,DATA:{items,events:[{date:final,title:'CVP Final Exam'}]},
  today:()=>current,day:current,Study:{gap:(a,b)=>(Date.parse(a)-Date.parse(b))/86400000},
  settings:{},filters:{},view:'dashboard',lessonCourse:'all',syncMeta:{},syncConflict:null,
  state:structuredClone(saved.records),validDate:s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s),
  validateBackup:raw=>Object.fromEntries(Object.entries(raw.records).map(([id,{dates,done}])=>[id,{dates,done}])),
  cleanSettings:()=>({}),persist(){},scheduleSync(){},syncMessage(){},render(){},row(){},datedReviewItem(){},dayTaskPanels(){},
  lessonById:()=>null,storeOptions:()=>({autopilot:{enabled:false,lastPlan:{final,unplaced:[{id:'CVP-A5',pass:1,date:'2026-11-17'}]}}}),assessmentClock:()=>({}),
  document:{addEventListener(){}},window:{}};
 ctx.rec=x=>ctx.state[x.id]||{};
 ctx.dates=x=>ctx.rec(x).dates||x.dates;
 ctx.done=(x,p)=>ctx.rec(x).done?.[p];
 ctx.tasks=(xs=items)=>xs.flatMap(x=>[0,1,2].map(p=>({x,p,date:ctx.dates(x)[p],done:ctx.done(x,p)})));
 ctx.adoptCloud=remote=>{ctx.state=ctx.validateBackup(remote.snapshot);ctx.render()};
 runInNewContext(readFileSync('public/study-autopilot-engine.js','utf8')+'\n'+readFileSync('public/study-autopilot.js','utf8'),ctx);
 const check=()=>{
  assert.ok(!ctx.tasks().some(t=>t.x.id==='CVP-A5'&&t.p===1));
  assert.equal(ctx.tasks().filter(t=>t.p===2&&!t.done&&t.date<current).length,0);
  assert.deepEqual(ctx.tasks().filter(t=>t.p===2).map(t=>t.x.id),['CVP-A2','CVP-A4']);
  assert.equal(ctx.tasks().filter(t=>t.p<2&&t.date<current).length,11);
 };
 check();
 ctx.adoptCloud({snapshot:JSON.parse(JSON.stringify(saved))});
 check();
});

test('27 second reviews spread across eligible days, with at most two on the exam eve',()=>{
 const day='2026-11-08',final='2026-11-18',eve='2026-11-17';
 const items=Array.from({length:27},(_,i)=>({id:'CVP-P'+(i+1),course:'CVP',dates:['2026-11-01',eve,'2026-11-19']}));
 const records=Object.fromEntries(items.map(x=>[x.id,{done:{0:'2026-11-06T00:00:00Z'}}]));
 const events=[{date:final,title:'CVP Final Exam'}];
 const plan=finalCatchup(api,items,records,day,events,()=>120);
 assert.equal(plan.secondPlaced,27);
 const dates=items.map(x=>plan.records[x.id].dates[1]);
 assert.equal(new Set(dates).size,9);
 assert.ok(dates.every(d=>d<eve));
 assert.ok(dates.every(d=>dates.filter(other=>other===d).length<=3));
 const constrained=finalCatchup(api,items,records,day,events,d=>d===eve?180:0);
 assert.equal(constrained.secondPlaced,2);
 assert.equal(constrained.unplaced.length,25);
 assert.ok(constrained.unplaced.every(u=>u.date===eve&&u.pass===1));
});
