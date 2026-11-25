import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('public/profile-entry.js','utf8');
const KEY='alfaisal-review-studio-v1';
function client({fresh=true,settings={},saved={},bound=null,snapshotSetup={profileName:'Synthetic Student',studentNumber:'123456789',profileCreatedAt:'2026-11-17T10:00:00Z',studentGroup:'M2',studentSection:'B',groupConfigured:true,labGroup:'2.3'}}={}){
 let setupCount=0,persistCount=0;const switches=[],storage=new Map(bound?[[KEY+'-account',bound]]:[]);
 const profileUI={setup:async()=>{setupCount++;return {...snapshotSetup}},switchAccount:async key=>switches.push(key),signedOut(){}};
 const ctx={Event,window:fresh?{REVIEW_STUDIO_FRESH_ACCOUNTS:true,dispatchEvent(){}}:{},settings,saved,syncMeta:{revision:0},KEY,DATA:{items:[],events:[]},state:{},
  paintProfile(){},cleanSettings:x=>x,esc:x=>x,persist:()=>persistCount++,saveOptions(){},storeOptions:()=>({}),
  document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},profileUI,
  queueMicrotask(){},alert(){}};
 vm.createContext(ctx);vm.runInContext(source.replace("import('/student-profile.mjs?v=4')",'Promise.resolve(profileUI)')+';this.profile=StudentProfile',ctx);
 return {ctx,storage,switches,get setupCount(){return setupCount},get persistCount(){return persistCount}};
}

test('fresh account with an existing draft lacking profile still completes onboarding',async()=>{
 const c=client({bound:'account-a',settings:{legacyProfile:true,profileName:'Hatem Alabrach',studentGroup:'M1',studentSection:'A',labGroup:'1.6'},saved:{records:{seeded:{done:{0:'2026-11-16'}}}}});
 assert.equal(await c.ctx.profile.remote({accountKey:'account-a',snapshot:{records:{seeded:{}},settings:{}}}),true);
 assert.equal(c.setupCount,1);assert.equal(c.ctx.profile.identity().name,'Synthetic Student');assert.equal(c.ctx.profile.identity().number,'123456789');
 assert.equal(c.ctx.profile.groupLabel(),'M2-B / Group 2.3');
});

test('fresh account without any cloud snapshot starts onboarding and keeps neutral identity until then',async()=>{
 const c=client();assert.equal(c.ctx.profile.identity().name,'');assert.equal(c.ctx.profile.groupLabel(),'Made by Hatem');
 assert.equal(await c.ctx.profile.remote({accountKey:'new-account',snapshot:null}),true);assert.equal(c.setupCount,1);assert.equal(c.ctx.profile.identity().name,'Synthetic Student');
});

test('fresh account switch uses the existing account boundary before onboarding',async()=>{
 const c=client({bound:'old-account',settings:{profileName:'Synthetic Prior Student'}});
 assert.equal(await c.ctx.profile.remote({accountKey:'new-account',snapshot:null}),false);assert.deepEqual(c.switches,['new-account']);assert.equal(c.setupCount,0);
});

test('configured cloud profile restores without prompting and retains its academic selections',async()=>{
 const c=client({bound:'account-a'});const settings={profileName:'Synthetic Returning Student',studentNumber:'987654321',profileCreatedAt:'2026-10-01T10:00:00Z',studentGroup:'F2',studentSection:'B',groupConfigured:true,labGroup:'Lab 2',englishFrequency:3,englishStartTime:'17:00'};
 assert.equal(await c.ctx.profile.remote({accountKey:'account-a',snapshot:{settings}}),true);assert.equal(c.setupCount,0);assert.equal(c.ctx.profile.identity().name,'Synthetic Returning Student');assert.equal(c.ctx.profile.groupLabel(),'F2-B / Group Lab 2');assert.equal(c.ctx.settings.englishFrequency,3);
});

test('fresh legacy-shaped snapshots and restoration hooks never inject owner identity',async()=>{
 const c=client({bound:'account-a',settings:{legacyProfile:true}});await c.ctx.profile.remote({accountKey:'account-a',snapshot:{records:{old:{}},settings:{}}});
 c.ctx.profile.restoreLegacy({settings:{}});assert.equal(c.ctx.profile.identity().name,'Synthetic Student');assert.equal(c.ctx.profile.groupLabel(),'M2-B / Group 2.3');
});

test('flag absent preserves original Site legacy profile behavior',async()=>{
 const c=client({fresh:false,bound:'legacy-account'});assert.equal(await c.ctx.profile.remote({accountKey:'legacy-account',snapshot:{records:{old:{}},settings:{}}}),true);
 assert.equal(c.setupCount,0);assert.equal(c.ctx.profile.identity().name,'Hatem Alabrach');assert.equal(c.ctx.profile.groupLabel(),'M1-A / Group 1.6');
});

test('unchanged cloud response restores a same-account managed profile without repeating onboarding',async()=>{
 const c=client({bound:'account-a',settings:{profileName:'Returning Student',profileCreatedAt:'2026-11-17T10:00:00Z',studentGroup:'M2',studentSection:'B',labGroup:'2.9'}});
 assert.equal(await c.ctx.profile.remote({accountKey:'account-a',unchanged:true}),true);assert.equal(c.setupCount,0);assert.equal(c.ctx.profile.identity().name,'Returning Student');assert.equal(c.ctx.profile.groupLabel(),'M2-B / Group 2.9');
});
test('unchanged response cannot bless a legacy-shaped or incomplete managed profile',async()=>{
 for(const settings of [{profileName:'Old Owner',legacyProfile:true,profileCreatedAt:'2026-01-01'}, {profileName:'Draft'}]){
  const c=client({bound:'account-a',settings});await c.ctx.profile.remote({accountKey:'account-a',unchanged:true});assert.equal(c.setupCount,1);
 }
});
