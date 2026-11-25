import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {updateCardReview} from '../public/phase3-anki-core.mjs';
const original={due:1000,interval:2,reps:3},at='2026-11-25T12:00:00Z';
test('card suspension and reset retain other cards and produce timestamped sync values',()=>{
 const prior={cards:{'deck:7':{due:2000,interval:5,reps:7},'deck:8':{due:3000,interval:7,reps:9}},session:null};
 const paused=updateCardReview(prior,'deck:7','suspend',original,at);
 assert.equal(paused.cards['deck:7'].suspended,true);assert.equal(paused.cards['deck:7'].reps,7);
 assert.equal(prior.cards['deck:7'].suspended,undefined);
 assert.deepEqual(paused.cards['deck:8'],prior.cards['deck:8']);
 const resumed=updateCardReview(paused,'deck:7','resume',original,at);assert.equal(resumed.cards['deck:7'].suspended,false);
 const reset=updateCardReview(resumed,'deck:7','reset',original,at);assert.equal(reset.cards['deck:7'].reps,3);assert.equal(reset.cards['deck:7'].reset,true);assert.equal(reset.cards['deck:7'].at,at);
 assert.throws(()=>updateCardReview(prior,'deck:7','erase',original,at));
});
test('Anki management renders bounded card browser and excludes suspended cards from due sessions',()=>{
 const s=readFileSync(new URL('../public/anki.js',import.meta.url),'utf8');
 assert.match(s,/cards\.slice\(ankiBrowserPage\*40/);
 assert.match(s,/if\(status\.suspended\)continue/);
 assert.match(s,/data-anki-card-suspend/);
 assert.match(s,/data-anki-card-reset/);
 assert.match(s,/ankiCheckAccount\(account\);StudyVault\.set\('anki',next\)/);
});
