import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const ctx=vm.createContext({module:{exports:{}}});vm.runInContext(fs.readFileSync('public/group-schedule-core.js','utf8'),ctx);const core=ctx.module.exports,catalog=JSON.parse(fs.readFileSync('public/group-timetables.json'));
const settings={studentGroup:'M1',studentSection:'A',labGroup:'1.6',englishFrequency:2,englishStartTime:'17:00'};
test('English days and one-hour time blocks follow both linked preferences',()=>{for(const frequency of [2,3])for(const start of ['17:00','17:30']){const e=core.english('2026-11-22',{...settings,englishFrequency:frequency,englishStartTime:start});assert.deepEqual(Array.from(e,v=>new Date(v.date).getUTCDay()),frequency===2?[1,3]:[0,2,4]);assert.ok(e.every(v=>v.end-v.start===60&&v.start===(start==='17:00'?1020:1050)))}assert.equal(core.english('2026-11-22',{...settings,englishEnabled:false}).length,0)});
test('Renal class columns and section labs are isolated with no owner timetable leak',()=>{const legacy=[{id:'owner',date:'2026-11-24',start:700,end:750,title:'Owner only'}];const m1=core.selected('2026-11-22',settings,catalog,legacy);assert.ok(m1.some(e=>e.id==='official-ren-2026-11-24-J23'));assert.ok(!m1.some(e=>e.id==='official-ren-2026-11-24-J29'));const f2=core.selected('2026-11-22',{...settings,studentGroup:'F2',studentSection:'B',labGroup:'2.9'},catalog,legacy);assert.ok(!f2.some(e=>e.id==='owner'||e.studentSection==='A'));assert.ok(f2.some(e=>e.id==='official-ren-2026-11-25-Q14'));assert.equal(core.selected('2026-11-22',{},catalog,legacy).filter(e=>!e.custom).length,0)});
test('MOL lab subgroup and newest room mapping are exact and duplicates merge',()=>{const e=catalog.events.filter(e=>e.date==='2026-11-04'&&e.course==='MOL'&&core.assigned(e,{studentGroup:'F2',studentSection:'A',labGroup:'2.3'}));assert.equal(e.length,1);assert.equal(e[0].room,'SG 81');assert.equal(e[0].start,600);assert.equal(e[0].end,720);assert.ok(e[0].references.length>=2);assert.ok(!core.assigned(e[0],{studentGroup:'F2',studentSection:'A',labGroup:'2.1'}));const renal=catalog.events.find(e=>e.course==='MOL'&&e.date==='2026-12-01');assert.ok(core.assigned(renal,settings));assert.equal(renal.start,900);assert.equal(renal.end,1020)});
test('selection preserves inputs, commitments and stable event identifiers',()=>{const before=JSON.stringify({catalog,settings}),record={done:{0:'2026-11-10'},dates:['2026-11-01'],mcqs:[{id:'keep'}]},history=JSON.stringify(record);core.selected('2026-11-22',settings,catalog,[]);assert.equal(JSON.stringify({catalog,settings}),before);assert.equal(JSON.stringify(record),history);assert.equal(new Set(catalog.events.map(e=>e.id)).size,catalog.events.length);assert.equal(catalog.groups.length,8);assert.ok(catalog.events.every(e=>e.start<e.end&&e.references.length&&e.date))});
test('explicitly clearing lab preference does not inherit legacy owner lab',()=>{assert.equal(core.profile({legacyProfile:true,labGroup:'',labGroupConfigured:true}).lab,'');assert.equal(core.profile({legacyProfile:true}).lab,'1.6')});


test('latest Renal PDF covers all four class groups and both lab sections',()=>{
 const events=catalog.events.filter(e=>e.course==='REN');
 assert.ok(events.length&&events.every(e=>e.source==='Renal Schedule.pdf'&&e.references[0].page));
 for(const group of ['M1','M2','F1','F2'])for(const section of ['A','B']){
  const selection={studentGroup:group,studentSection:section,englishEnabled:false};
  const first=core.selected('2026-11-22',selection,catalog,[]);
  assert.ok(first.some(e=>e.kind==='anatomy')&&first.some(e=>e.kind==='physiology'));
  assert.equal(first.filter(e=>e.kind==='lab').length,1);
  assert.equal(first.find(e=>e.kind==='lab').studentSection,section);
  const second=core.selected('2026-11-29',selection,catalog,[],true);
  assert.ok(second.some(e=>e.shared&&e.start===1020&&e.end===1200));
  assert.ok(!core.selected('2026-11-29',selection,catalog,[]).some(e=>e.shared));
 }
 const renalP2=events.find(e=>e.title==='P2');
 assert.equal(renalP2.doctor,'Dr. Anzhelika');
});
