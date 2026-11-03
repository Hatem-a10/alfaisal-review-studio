import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/app.js','utf8');
const fn=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf(next,source.indexOf('function '+name+'(')));
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('public/data.js','utf8')+';globalThis.events=DATA.events',ctx);
vm.runInContext(fn('nextAssessment','function assessmentHero'),ctx);
vm.runInContext(fn('vaultValuesEqual','async function syncCloud'),ctx);
test('upcoming assessment advances after each date and handles the end of the schedule',()=>{
 assert.equal(ctx.nextAssessment(ctx.events,'2026-10-29').title,'MOL Midterm');
 assert.equal(ctx.nextAssessment(ctx.events,'2026-10-30').title,'TBL-4');
 assert.equal(ctx.nextAssessment(ctx.events,'2026-11-02').title,'MOL TBL 2');
 assert.match(ctx.nextAssessment(ctx.events,'2026-11-16').title,/Final Exam/);
 assert.equal(ctx.nextAssessment(ctx.events,'2026-11-25').title,'MOL Final');
 assert.equal(ctx.nextAssessment(ctx.events,'2026-12-21'),null);
});
test('sync recognizes equal content despite metadata timestamps but preserves true differences',()=>{
 const x={stores:{history:{at:'one',value:[1]},options:{at:'a',value:{theme:'dark'}}}};
 const y={stores:{options:{at:'b',value:{theme:'dark'}},history:{at:'two',value:[1]}}};
 assert.equal(ctx.vaultValuesEqual(x,y),true);
 y.stores.history.value=[2];assert.equal(ctx.vaultValuesEqual(x,y),false);
 assert.equal(ctx.vaultValuesEqual({stores:{history:{value:null}}},{stores:{}}),false);
});

test('assessment banner follows the selected planning day',()=>{
 ctx.DATA={events:ctx.events};ctx.Study={gap:(a,b)=>(Date.parse(a)-Date.parse(b))/86400000};ctx.esc=x=>x;ctx.fullDate=x=>x;ctx.day='2026-10-29';
 vm.runInContext(fn('assessmentHero','function dashboard'),ctx);
 assert.match(ctx.assessmentHero(),/MOL Midterm/);assert.match(ctx.assessmentHero(),/Today/);
 ctx.day='2026-10-30';assert.match(ctx.assessmentHero(),/CVP 112 · TBL-4/);assert.match(ctx.assessmentHero(),/2 days left/);
 ctx.day='2026-11-02';assert.match(ctx.assessmentHero(),/MOL TBL 2/);
});

test('sync ignores object key order but keeps completion clears and date changes meaningful',()=>{assert.equal(ctx.syncValuesEqual({done:{0:null},notes:'x'},{notes:'x',done:{0:null}}),true);assert.equal(ctx.syncValuesEqual({done:{0:null}},{done:{0:'2026-11-02T10:00Z'}}),false);assert.equal(ctx.syncValuesEqual({dates:['2026-11-02']},{dates:['2026-11-03']}),false)});
