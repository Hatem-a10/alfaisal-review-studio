import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/lecture-updates.js',import.meta.url),'utf8'),at='2026-11-24T12:00:00Z',payload={version:1,baselineAt:at,entries:[{at,changes:[{id:'MOL-1',details:['Updated']},{id:'CVP-A1',details:['Archive']}]}]};
function harness(fetch){
 const window={reviewAdmin:true,reviewStudyItemVisible:x=>!x.id.startsWith('CVP')},opts={};
 const context={window,storeOptions:()=>opts,DATA:{items:[]},uploads:[{id:'one',lectureId:'MOL-1',createdAt:at,name:'Upload'},{id:'one',lectureId:'MOL-1',createdAt:at,name:'Duplicate'},null],StudyVault:{read:()=>({items:{one:{candidates:[null,{status:'approved'}]}}})},fetch,AbortController,setTimeout:()=>1,clearTimeout(){},paint(){}};
 const start=source.indexOf(' let log='),end=source.indexOf(' function updates()',start),a=source.indexOf(' async function refresh()'),b=source.indexOf(' function paint()',a);
 const api=runInNewContext(source.slice(start,end)+source.slice(a,b)+'\n({normalizeLog,entries,invalidate,refresh,status:()=>status})',context);
 return {window,opts,api};
}
test('invalid nested log rows cannot enter rendering',()=>{
 const h=harness(async()=>{});
 for(const bad of [{...payload,baselineAt:'bad'},{...payload,entries:[null]},{...payload,entries:[{at,changes:[{id:'MOL-1',details:'text'}]}]}])assert.throws(()=>h.api.normalizeLog(bad),/Invalid/);
});
test('visible entries exclude hidden course history and duplicate uploads',async()=>{
 const h=harness(async()=>({ok:true,json:async()=>payload}));
 await h.api.refresh();const rows=h.api.entries();assert.equal(rows.length,2);assert.ok(rows.every(r=>r.id==='MOL-1'));assert.match(rows.find(r=>r.kind==='Your upload').details[0],/1 questions/);
});
test('revocation invalidates stale responses even when admin role returns before they resolve',async()=>{
 const resolvers=[],h=harness(()=>new Promise(r=>resolvers.push(r)));
 const first=h.api.refresh();h.window.reviewAdmin=false;h.api.invalidate();h.window.reviewAdmin=true;const second=h.api.refresh();
 resolvers[1]({ok:true,json:async()=>payload});await second;
 resolvers[0]({ok:true,json:async()=>({...payload,entries:[]})});await first;
 assert.equal(h.api.entries().filter(r=>r.kind==='Course update').length,1);
});
test('failed and concurrent fetches remain retryable without claiming an empty history',async()=>{
 let calls=0;const h=harness(async()=>({ok:++calls>1,json:async()=>payload}));
 await h.api.refresh();assert.equal(h.api.status(),'error');
 await h.api.refresh();assert.equal(h.api.status(),'ready');
 assert.match(source,/data-retry-lecture-changelog/);assert.match(source,/status==='ready'\?'<p class="muted">No recorded/);
});
