import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const core=runInNewContext(readFileSync(new URL('../public/group-schedule-core.js',import.meta.url),'utf8')+';GroupSchedules');
const day='2026-11-22',settings={studentGroup:'M1',studentSection:'A',labGroup:'1.6',englishEnabled:false},base={id:'x',date:day,start:480,end:540,studentGroups:['M1'],studentSection:'A'};
const ids=rows=>Array.from(rows,e=>e.id);
test('explicitly cleared academic group does not inherit the owner group or timetable',()=>{
 const cleared={legacyProfile:true,groupConfigured:true,studentGroup:'',studentSection:'',englishEnabled:false};
 assert.equal(core.profile(cleared).group,'');assert.equal(core.profile(cleared).section,'');
 assert.equal(core.selected(day,cleared,{events:[base]},[{...base,id:'legacy'}]).length,0);
});
test('invalid membership collections never select a session',()=>{
 assert.equal(core.assigned({...base,studentGroups:'M1'},settings),false);
 assert.equal(core.assigned({...base,labGroups:'1.6'},settings),false);
 assert.equal(core.assigned(null,settings),false);assert.equal(core.assigned(base,settings),true);
});
test('invalid date and timed intervals cannot enter weekly rendering',()=>{
 const rows=[base,null,{...base,id:'invalid-date',date:'2026-11-31'},{...base,id:'negative',start:-1},{...base,id:'backward',end:420},{...base,id:'string',start:'480'}];
 assert.deepEqual(ids(core.selected(day,settings,{events:rows},null)),['x']);
 assert.equal(core.selected('2026-02-30',settings,{events:rows},[]).length,0);
 assert.equal(core.english('bad',settings).length,0);
});
test('official identity takes precedence over duplicate legacy timetable rows',()=>{
 const legacy={...base,title:'old'},official={...base,title:'official'};
 const rows=core.selected(day,settings,{events:[official]},[legacy]);assert.equal(rows.length,1);assert.equal(rows[0].title,'official');
});
test('authority uses explicit assessment course when title omits it, but titled courses take precedence',()=>{
 const source={...base,id:'source',course:'REN',kind:'assessment',title:'Final exam',source:'Renal Schedule.pdf'},old={id:'old',course:'REN',kind:'assessment',title:'Final exam',date:'2026-11-24'};
 assert.deepEqual(ids(core.authoritative([old,source],[source])),['source']);
 const mol={...source,title:'MOL 114 final exam'},oldMol={...old,course:'MOL',id:'mol'};
 assert.deepEqual(ids(core.authoritative([old,oldMol,mol],[mol])),['old','source']);
});
test('authoritative overlap only uses valid same-day intervals and preserves adjacent sessions',()=>{
 const ren={...base,id:'ren',course:'REN',source:'Renal Schedule.pdf'},adjacent={...base,id:'adjacent',start:540,end:600},overlap={...base,id:'overlap',start:500,end:550},other={...overlap,id:'other',date:'2026-11-23'};
 assert.deepEqual(ids(core.authoritative([ren,adjacent,overlap,other],[ren,null])),['ren','adjacent','other']);
});
