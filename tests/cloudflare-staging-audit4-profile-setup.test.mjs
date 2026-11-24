import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {VERIFIED_GROUPS} from '../public/verified-groups.mjs';
const source=readFileSync(new URL('../public/student-profile.mjs',import.meta.url),'utf8');
function groupHarness(fetch){const start=source.indexOf('let groupConfig='),end=source.indexOf('function style()',start);return runInNewContext(source.slice(start,end)+'\n({mergeGroups,loadGroups,labChoices})',{VERIFIED_GROUPS,fetch})}
test('group config is atomically validated and does not mutate verified defaults',async()=>{
 const before=JSON.stringify(VERIFIED_GROUPS);let data={groups:[{studentGroup:'M1',studentSection:'A',labGroups:['custom','custom']},null]};
 const h=groupHarness(async()=>({ok:true,json:async()=>data}));
 await h.loadGroups();assert.equal(h.labChoices('M1','A').includes('custom'),false);
 data={groups:[{studentGroup:'M1',studentSection:'A',labGroups:['custom','custom']}]};await h.loadGroups();
 assert.equal(h.labChoices('M1','A').filter(x=>x==='custom').length,1);assert.equal(JSON.stringify(VERIFIED_GROUPS),before);
 assert.throws(()=>h.mergeGroups([{studentGroup:'M1',studentSection:'A',labGroups:'invalid'}]),/Invalid/);
});
test('concurrent group lookups share one request and one validated result',async()=>{
 let calls=0,release;const response=new Promise(r=>release=r),h=groupHarness(()=>{calls++;return response});
 const a=h.loadGroups(),b=h.loadGroups();release({ok:true,json:async()=>({groups:[]})});const [x,y]=await Promise.all([a,b]);assert.equal(calls,1);assert.equal(x,y);
});
const prefix='alfaisal-review-studio-v1';
function accountHarness(initial,window={},fail=()=>false){
 const storage={...initial};for(const [k,fn] of Object.entries({getItem:key=>storage[key]??null,setItem:(key,value)=>{if(fail(key,value))throw Error('quota');storage[key]=String(value)},removeItem:key=>delete storage[key]}))Object.defineProperty(storage,k,{value:fn,enumerable:false});
 let reloads=0;const code=source.slice(source.indexOf('export async function switchAccount')).replace('export ','');
 const switchAccount=runInNewContext('const prefix='+JSON.stringify(prefix)+';'+code+'\nswitchAccount',{window,localStorage:storage,location:{reload(){reloads++}}});
 return {switchAccount,storage,reloads:()=>reloads};
}
test('managed account cannot fall back to unisolated raw storage when device DB is unavailable',async()=>{
 const h=accountHarness({[prefix+'-account']:'a',[prefix]:'keep'},{REVIEW_STUDIO_FRESH_ACCOUNTS:true});
 await assert.rejects(h.switchAccount('b'),/Secure device storage/);assert.equal(h.storage[prefix],'keep');assert.equal(h.reloads(),0);
});
test('legacy switch rejects malformed or wrong-account copies before changing current progress',async()=>{
 for(const next of [[],{[prefix]:'other',[prefix+'-account']:'wrong'},{[prefix]:{invalid:true}}]){
  const h=accountHarness({[prefix+'-account']:'a',[prefix]:'keep',['review-studio-account-copy:b']:JSON.stringify(next)});
  await assert.rejects(h.switchAccount('b'),/invalid/);assert.equal(h.storage[prefix],'keep');assert.equal(h.storage[prefix+'-account'],'a');assert.equal(h.reloads(),0);
 }
});
test('legacy switch rollback retains current copy on quota failure',async()=>{
 const h=accountHarness({[prefix+'-account']:'a',[prefix]:'keep',['review-studio-account-copy:b']:JSON.stringify({[prefix]:'other',[prefix+'-account']:'b'})},{},(k,v)=>k===prefix&&v==='other');
 await assert.rejects(h.switchAccount('b'),/recovery copy/);assert.equal(h.storage[prefix],'keep');assert.equal(h.storage[prefix+'-account'],'a');assert.equal(JSON.parse(h.storage['review-studio-account-copy:a'])[prefix],'keep');assert.equal(h.reloads(),0);
});
test('profile setup guards legacy defaults, empty normalized identifiers and canceled appearance',()=>{
 assert.match(source,/legacy=settings.legacyProfile&&!settings.groupConfigured/);
 assert.match(source,/Object.assign\(settings,initialAppearance\);applyTheme\(\)/);
 assert.match(source,/step===1\|\|step===5/);
 assert.match(source,/loadGroups\(\).then\(\(\)=>fill\(true\)\)/);
});
const entry=readFileSync(new URL('../public/profile-entry.js',import.meta.url),'utf8');
test('managed legacy-shaped cloud profile cannot bypass onboarding',async()=>{
 const settings={legacyProfile:true},saved={},KEY=prefix,storage=new Map([[prefix+'-account','account']]);let setups=0;
 const profileUI={async setup(){setups++;return {profileName:'New Student',studentNumber:'123',profileCreatedAt:'2026-11-24T12:00:00Z',legacyProfile:false}}};
 const ctx={window:{REVIEW_STUDIO_FRESH_ACCOUNTS:true,dispatchEvent(){}},settings,saved,syncMeta:{revision:0},KEY,paintProfile(){},cleanSettings:x=>x,esc:x=>x,persist(){},document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},profileUI,Event};
 const api=runInNewContext(entry.replace("import('/student-profile.mjs?v=2')","Promise.resolve(profileUI)")+'\nStudentProfile',ctx);
 await api.remote({accountKey:'account',snapshot:{settings:{profileName:'Legacy',legacyProfile:true,profileCreatedAt:'2026-11-20T12:00:00Z'}}});
 assert.equal(setups,1);assert.equal(api.identity().name,'New Student');
});
