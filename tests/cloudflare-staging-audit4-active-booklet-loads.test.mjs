import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {validateActiveBooklet,bookletLoader} from '../public/active-booklet-core.mjs';
const metadata={version:2,pages:294},q={id:'ren-booklet-p6-q1',type:'mcq',question:'Synthetic question',page:6,options:['A','B'],answer:1};
const pack={version:2,questions:[q]};
test('validate booklet before publishing, reject malformed rows, IDs and source locators',()=>{
 assert.equal(validateActiveBooklet(pack,metadata),pack);
 for(const bad of [{...pack,questions:{length:1}},{...pack,questions:[q,q]},{...pack,questions:[null]},{...pack,questions:[{...q,id:''}]},{...pack,questions:[{...q,page:295}]},{...pack,questions:[{...q,page:1.5}]},{...pack,questions:[{...q,type:'unknown'}]},{...pack,questions:[{...q,question:''}]}])assert.throws(()=>validateActiveBooklet(bad,metadata));
});
test('invalid answer choices, keys, context and figure payloads fail before they enter the viewer',()=>{
 for(const patch of [{options:{}},{options:['']},{answer:2},{answer:'1'},{acceptedAnswers:[2]},{acceptedAnswers:'1'},{figures:{}},{figures:[null]},{contextQuestionIds:42}])assert.throws(()=>validateActiveBooklet({...pack,questions:[{...q,...patch}]},metadata));
 assert.equal(validateActiveBooklet({...pack,questions:[q,{id:'written',type:'saq',page:200,question:'Recall'}]},metadata).questions.length,2);
 assert.throws(()=>validateActiveBooklet({...pack,chapters:[{page:999,title:'Wrong'}]},metadata));
});
test('shared loader coalesces requests and retries after malformed data or network failure',async()=>{
 let calls=0;const load=bookletLoader('/pack',metadata,{fetcher:async()=>{calls++;if(calls===1)throw Error('offline');return {ok:true,json:async()=>calls===2?{...pack,questions:{length:1}}:pack}}});
 await assert.rejects(load(),/offline/);await assert.rejects(load(),/incomplete/);
 const a=load(),b=load();assert.equal(a,b);assert.equal(await a,pack);assert.equal(await load(),pack);assert.equal(calls,3);
});
test('a stalled request is aborted and can be retried',async()=>{
 let calls=0;
 const load=bookletLoader('/pack',metadata,{timeout:10,fetcher:async(url,{signal})=>{if(++calls===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}));return {ok:true,json:async()=>pack}}});
 await assert.rejects(load(),/timeout/);assert.equal(await load(),pack);
});
test('REN loader publishes only a complete mock bank and retries a failed load on its own',async()=>{
 const s=readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');
 const start=s.indexOf('let renalPack,'),end=s.indexOf('const bookletPack=',start);
 let calls=0,renders=0;const ctx={loadRenalBooklet:async()=>{if(++calls===1)throw Error('offline');return pack},view:'booklet',bookletCourse:()=> 'MOL',window:{reviewCourseScope:'MOL',reviewAutoRetry:{schedule:(key,run)=>scheduled.push([key,run]),ok(){}}},render:()=>renders++,toast:()=>{},console:{error(){}}};const scheduled=[];
 const api=runInNewContext(s.slice(start,end)+'\n({loadRenal,renalPracticeQuestions,error:()=>renalError,pack:()=>renalPack})',ctx);
 await api.loadRenal();assert.equal(api.error(),false);assert.equal(api.pack(),undefined);assert.equal(renders,0);assert.equal(scheduled[0]?.[0],'renal-practice');
 ctx.view='practice';ctx.window.reviewCourseScope='REN';await scheduled[0][1]();assert.equal(api.error(),false);assert.equal(api.renalPracticeQuestions().length,1);assert.equal(renders,1);
 assert.doesNotMatch(readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8'),/Renal questions could not load/);
});

test('deduplicated packs enforce the declared MCQ inventory and allow review-only questions',()=>{
 const v3={version:3,counts:{mcq:1},questions:[{...q,answer:null,legacyChoices:{old:[1,0]},sourceLocations:[{page:6},{page:8}]}]};
 assert.equal(validateActiveBooklet(v3,{version:3,pages:294,mcqs:1}),v3);
 assert.throws(()=>validateActiveBooklet(v3,{version:3,pages:294,mcqs:2}),/unique booklet MCQs/);
 assert.throws(()=>validateActiveBooklet({...v3,counts:{mcq:3}},{version:3,pages:294,mcqs:1}),/counts do not match/);
 for(const patch of [{legacyChoices:{old:[2,0]}},{legacyChoices:{[q.id]:[0,1]}},{sourceLocations:[{page:999}]}])
  assert.throws(()=>validateActiveBooklet({...v3,questions:[{...v3.questions[0],...patch}]},{version:3,pages:294,mcqs:1}));
});
