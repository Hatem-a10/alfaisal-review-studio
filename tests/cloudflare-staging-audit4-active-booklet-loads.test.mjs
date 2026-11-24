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
test('REN loader publishes only a complete mock bank and exposes an error state for retry',async()=>{
 const s=readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');
 const start=s.indexOf('let renalPack,'),end=s.indexOf('const bookletPack=',start);
 let calls=0,renders=0;const ctx={loadRenalBooklet:async()=>{if(++calls===1)throw Error('offline');return pack},view:'booklet',bookletCourse:()=> 'MOL',window:{reviewCourseScope:'MOL'},render:()=>renders++,toast:()=>{}};
 const api=runInNewContext(s.slice(start,end)+'\n({loadRenal,renalPracticeQuestions,error:()=>renalError,pack:()=>renalPack})',ctx);
 await api.loadRenal();assert.equal(api.error(),true);assert.equal(api.pack(),undefined);assert.equal(api.renalPracticeQuestions().length,0);assert.equal(renders,0);
 ctx.view='practice';ctx.window.reviewCourseScope='REN';await api.loadRenal();assert.equal(api.error(),false);assert.equal(api.renalPracticeQuestions().length,1);assert.equal(renders,1);
 assert.match(s,/b\.id==='renalMockRetry'/);
 assert.match(readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8'),/id="renalMockRetry"/);
});
