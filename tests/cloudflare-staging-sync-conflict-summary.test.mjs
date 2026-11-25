import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('function syncValuesEqual('),end=source.indexOf('function paintSyncConflict(',start);
const counts=runInNewContext(source.slice(start,end)+'\nsyncConflictCounts',{});
const snapshot=(records,stores)=>({records,extras:{stores:Object.fromEntries(Object.entries(stores).map(([key,value])=>[key,{value}]))}});
test('counts stored review, mock, missed-question and card differences without duplicate mock IDs',()=>{
 const local=snapshot({a:{dates:['2026-11-23','2026-11-25'],done:{0:'old'}},b:{dates:['2026-11-25']}},{mock:{id:'r1',answers:{0:1}},history:[{id:'r1'},{id:'r2'}],wrongBank:{entries:[{question:{id:'q1'},choice:0}]},anki:{cards:{a:{due:2},b:{due:1}}}});
 const cloud=snapshot({a:{dates:['2026-11-23','2026-11-25'],done:{0:'new'}},c:{dates:['2026-11-26']}},{mock:{id:'r1',answers:{0:2}},history:[{id:'r1'},{id:'r3'}],wrongBank:{entries:[{question:{id:'q1'},choice:1}]},anki:{cards:{a:{due:2},c:{due:1}}}});
 const rows=JSON.parse(JSON.stringify(counts(local,cloud)));
 assert.deepEqual(rows.map(r=>[r.localOnly,r.cloudOnly,r.changed,r.total]),[[1,1,1,3],[1,1,1,3],[0,0,1,1],[1,1,0,2]]);
 assert.ok(counts(local,local).every(r=>r.total===0));
 assert.ok(counts({},{}).every(r=>r.total===0));
});
test('conflict UI exposes counts and explicit merge retry without displaying raw answers',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/id="syncConflictSummary" role="status"/);
 assert.match(html,/id="retryMerge"/);
 assert.match(source,/syncConflictCounts\(bundle\(\),remote.snapshot\)/);
 assert.match(source,/target.textContent='The copies could not be compared safely/);
});
