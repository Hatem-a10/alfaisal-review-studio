import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const s=fs.readFileSync(new URL('../public/wrong-bank.js',import.meta.url),'utf8');const code=s.slice(s.indexOf('const wrongReviewIntervals='),s.indexOf('function updateWrongReview('));const c=vm.createContext({});vm.runInContext(code+'\nglobalThis.state=wrongReviewState;globalThis.result=wrongReviewResult;',c);
test('wrong bank review expands successful intervals and resets after a wrong response or new miss',()=>{
 const at='2026-11-25T10:00:00Z',entry={missedAt:at};assert.equal(c.state(entry,Date.parse(at)).due,true);
 entry.review=c.result(entry,true,at);assert.equal(entry.review.dueAt,'2026-11-26T10:00:00.000Z');
 entry.review=c.result(entry,true,'2026-11-26T10:00:00Z');assert.equal(entry.review.dueAt,'2026-11-29T10:00:00.000Z');
 entry.review=c.result(entry,false,'2026-11-29T10:00:00Z');assert.equal(entry.review.level,0);assert.equal(entry.review.dueAt,'2026-11-30T10:00:00.000Z');assert.equal(c.state({...entry,missedAt:'2026-11-30T10:00:00Z'},Date.parse('2026-11-30T10:00:00Z')).due,true);
});
