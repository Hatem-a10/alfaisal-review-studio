import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const s=readFileSync(new URL('../public/hub-upgrade.js',import.meta.url),'utf8');
const code=s.slice(s.indexOf('function weeklyActivityTrends('),s.indexOf(' function activityPage(){'));
const api=runInNewContext(code+';({weeklyActivityTrends,weeklyActivityMarkup})',{esc:String});
test('weekly activity respects recorded values, ignores invalid numbers and leaves missing dates blank',()=>{
 const dates=['2026-11-18','2026-11-19','2026-11-20','2026-11-21','2026-11-22','2026-11-23','2026-11-24'];
 const data={'2026-11-18':{minutes:60,reviews:2,practice:3},'2026-11-19':{minutes:-3,reviews:1,practice:0},'2026-11-24':{minutes:30,reviews:1,practice:4}};
 const r=api.weeklyActivityTrends(data,dates);
 assert.equal(r.length,1);assert.equal(r[0].minutes,90);assert.equal(r[0].reviews,4);assert.equal(r[0].active,3);
 const markup=api.weeklyActivityMarkup(r);assert.match(markup,/90m/);assert.match(markup,/Weekly counts/);assert.match(markup,/2026-11-24/);
});
test('the activity history retains the original tracking uncertainty without invented records',()=>{
 assert.match(s,/Dashed cells have unknown historical tracking coverage/);
 assert.match(s,/weeklyActivityMarkup\(weeklyActivityTrends\(days,dates\)\)/);
});
