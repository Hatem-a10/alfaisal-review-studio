import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/study-autopilot-engine.js',import.meta.url),'utf8');
const api=runInNewContext(source+';StudyAutopilot',{structuredClone});
const old='2026-11-21T12:00:00Z',recent='2026-11-22T12:00:00Z',latest='2026-11-23T12:00:00Z';
const base=(a,b)=>structuredClone({...b,...a});
const dates=['2026-11-23','2026-11-24','2026-11-26'];
test('newer explicit unscheduling beats an older three-pass date array without introducing partial dates',()=>{
 const a={REN:{dates:[],_changed:{'dates.0':recent,'dates.1':recent,'dates.2':recent}}},b={REN:{dates,_changed:{'dates.0':old}}};
 for(const [x,y] of [[a,b],[b,a]]){const merged=api.mergeRecords(x,y,old,latest,base);assert.equal(merged.REN.dates.length,0);assert.equal(merged.REN._changed['dates.2'],recent)}
 const scheduled={REN:{dates,_changed:{'dates.1':latest}}};const merged=api.mergeRecords(a,scheduled,old,old,base);assert.deepEqual(Array.from(merged.REN.dates),dates);assert.equal(merged.REN._changed['dates.0'],latest);
});
test('explicit completion deletion is retained and a clocked removed record field is not resurrected',()=>{
 const a={x:{done:{},_changed:{'done.0':recent,notes:recent}}},b={x:{done:{0:old},notes:'obsolete',_changed:{'done.0':old,notes:old}}};
 const m=api.mergeRecords(a,b,recent,latest,base);assert.equal(m.x.done[0],null);assert.equal(Object.hasOwn(m.x,'notes'),false);
 const legacy=api.mergeRecords({x:{}},{x:{notes:'only existing copy'}},latest,old,base);assert.equal(legacy.x.notes,'only existing copy');
});
test('unrelated newer settings save cannot overwrite an explicitly changed setting',()=>{
 const a={theme:'light',budget:180,_changed:{budget:latest}},b={theme:'amoled',custom:'retained',_changed:{theme:recent}};
 const m=api.mergeSettings(a,b,latest,old);
 assert.equal(m.theme,'amoled');assert.equal(m.budget,180);assert.equal(m.custom,'retained');assert.equal(m._changed.theme,recent);
});
test('mere object key reordering does not advance field clocks',()=>{
 const before={x:{example:{b:1,a:2},dates,done:{0:old}}},after={x:{example:{a:2,b:1},dates:[...dates],done:{0:old}}};
 api.stampChanges(before,after,recent);assert.equal(Object.keys(after.x._changed).length,0);
 after.x.example.a=4;api.stampChanges(before,after,recent);assert.equal(after.x._changed.example,recent);
});
test('malformed legacy evidence and very large histories do not break field reconciliation',()=>{
 const local={x:{notes:'local',learning:{attempts:[null,{at:123}],results:{bad:null}},mcqs:{},sessions:Array.from({length:140000},()=>({endedAt:old}))}},remote={x:{notes:'new',learning:{attempts:[]}}};
 const m=api.mergeRecords(local,remote,old,recent,base);assert.equal(m.x.notes,'new');
});
test('automatic assessment rebalance honors disable and undo while explicit request can still run',()=>{
 const js=readFileSync(new URL('../public/study-autopilot.js',import.meta.url),'utf8'),start=js.indexOf('const balanced='),end=js.indexOf(';',start),expr=js.slice(start,end)+';balanced';
 const run=auto=>runInNewContext(expr,{auto,planReady:true,finalWindow:false,current:'2026-11-24'});
 assert.equal(run({enabled:false}),false);assert.equal(run({undoDay:'2026-11-24'}),false);assert.equal(run({enabled:false,requestAssessmentBalance:true}),true);assert.equal(run({enabled:true}),true);
 assert.match(js,/validDate\(c.before\)&&validDate\(c.after\)/);
 assert.match(js,/d.length===3&&d\[index\]===c.after&&!r.done\?\.\[index\]/);
});
