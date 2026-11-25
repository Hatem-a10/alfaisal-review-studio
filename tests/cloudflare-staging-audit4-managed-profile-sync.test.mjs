import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/managed-auth-client.js',import.meta.url),'utf8');
function profileHarness(fetch,state={}){
 const handlers={},settings={profileCreatedAt:'2026-11-24',profileName:'First'};
 const code=source.slice(source.indexOf(' let profileFingerprint='),source.indexOf(' function installManagedApp()'));
 const api=runInNewContext(code+'\n({syncProfile,studyCounts})',{settings,state,fetch,window:{addEventListener:(event,fn)=>handlers[event]=fn}});
 return {api,handlers,settings};
}
test('profile changed during pending save is sent after older request completes',async()=>{
 let release;const bodies=[],first=new Promise(r=>release=r);
 const h=profileHarness(async(url,options)=>{bodies.push(JSON.parse(options.body));return bodies.length===1?first:{ok:true}});
 const pending=h.api.syncProfile();h.settings.profileName='Latest';await h.api.syncProfile();release({ok:true});await pending;
 assert.deepEqual(bodies.map(b=>b.profile.name),['First','Latest']);
 await h.api.syncProfile();assert.equal(bodies.length,2);
});
test('failed profile saves can retry on reconnect or focus without another edit',async()=>{
 let calls=0;const h=profileHarness(async()=>({ok:++calls>1}));
 await h.api.syncProfile();await h.handlers.online();await h.handlers.focus();
 assert.equal(calls,2);
});
test('study-total payload contains counts only and settings has no switch for it',()=>{
 const h=profileHarness(async()=>({ok:true}),{a:{done:{0:'today'},mcqs:[{total:3,answers:['private']}],notes:'private'}});
 assert.deepEqual(JSON.parse(JSON.stringify(h.api.studyCounts())),{completedReviews:1,answeredQuestions:3});
 assert.doesNotMatch(source,/Share study totals with the site owner|privacyPayload/);
 assert.match(source,/api\+'study-counts'/);
});
test('study counts ignore malformed records, nonintegral and nonfinite totals',()=>{
 const h=profileHarness(async()=>({ok:true}),{bad:null,one:{done:{0:'today'},mcqs:[null,{total:2},{total:Infinity},{total:-4},{total:1.5},{total:'8'}]},two:{done:'bad',mcqs:{}}});
 assert.equal(JSON.stringify(h.api.studyCounts()),JSON.stringify({completedReviews:1,answeredQuestions:2}));
});
function statusHarness(fetch){
 const start=source.indexOf('  let currentStatus, appliedStatus,');
 const end=source.indexOf('  async function shareStudyCounts()',start);
 let applied=0,shared=0;
 const api=runInNewContext(source.slice(start,end)+'\n({status,current:()=>currentStatus})',{fetch,applyStatus:()=>applied++,shareStudyCounts:()=>shared++});
 return {...api,applied:()=>applied,shared:()=>shared};
}
test('forced status refresh queued during in-flight request is not lost',async()=>{
 let release,calls=0;const first=new Promise(r=>release=r),h=statusHarness(async()=>++calls===1?first:{ok:true,json:async()=>({flags:{readOnly:true}})});
 const pending=h.status();const forced=h.status(true);release({ok:true,json:async()=>({flags:{readOnly:false}})});await Promise.all([pending,forced]);
 assert.equal(calls,2);assert.equal(h.current().flags.readOnly,true);assert.equal(h.applied(),2);
});
test('failed or malformed status does not suppress a retry for a minute',async()=>{
 let calls=0;const h=statusHarness(async()=>{calls++;if(calls===1)return {ok:false};if(calls===2)return {ok:true,json:async()=>({flags:[]})};return {ok:true,json:async()=>({flags:{readOnly:false}})}});
 await h.status();await h.status();await h.status();await h.status();
 assert.equal(calls,3);assert.equal(h.applied(),1);assert.equal(h.shared(),1);
});
