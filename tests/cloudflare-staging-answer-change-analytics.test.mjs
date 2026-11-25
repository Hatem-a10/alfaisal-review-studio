import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {pacingSummary} from '../public/phase2-pacing.mjs';
const source=fs.readFileSync(new URL('../public/exam-engine.js',import.meta.url),'utf8'),context=vm.createContext({});vm.runInContext(source+'\nglobalThis.engine=ExamEngine;',context);
test('record answer switches in both directions, excluding initial or repeated choice',()=>{
 const run={questions:[{options:['a','b','c'],answer:1}],answers:{}};for(const choice of [0,1,1,2,0,1])context.engine.recordChange(run,0,choice);
 const p=pacingSummary(run);assert.equal(p.switches,1);assert.equal(p.improvements,2);assert.equal(p.otherWrong,1);assert.equal(p.allChanges,4);assert.equal(p.changeAnalyticsRecorded,true);
});
test('legacy snapshots do not imply unrecorded improvements were zero',()=>assert.equal(pacingSummary({questions:[{}],xp:{rightToWrong:{0:1}}}).changeAnalyticsRecorded,false));
