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
 assert.equal(ctx.nextAssessment(ctx.events,'2026-11-25'),null);
});
test('sync recognizes equal content despite metadata timestamps but preserves true differences',()=>{
 const x={stores:{history:{at:'one',value:[1]},options:{at:'a',value:{theme:'dark'}}}};
 const y={stores:{options:{at:'b',value:{theme:'dark'}},history:{at:'two',value:[1]}}};
 assert.equal(ctx.vaultValuesEqual(x,y),true);
 y.stores.history.value=[2];assert.equal(ctx.vaultValuesEqual(x,y),false);
 assert.equal(ctx.vaultValuesEqual({stores:{history:{value:null}}},{stores:{}}),false);
});
