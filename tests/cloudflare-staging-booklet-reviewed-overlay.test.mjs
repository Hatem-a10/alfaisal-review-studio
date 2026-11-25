import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyReviewedOverlay,fetchReviewedOverlay,reviewedOverlayPaths} from '../public/booklet-reviewed-overlay.mjs';
import {validateActiveBooklet} from '../public/active-booklet-core.mjs';

// Synthetic data only: the real overlays are private R2 assets.
const meta={version:3,pages:20,mcqs:2};
const selfCheck={id:'REN-X-Q001',type:'mcq',page:3,question:'Synthetic stem one?',options:['Alpha','Beta','Gamma'],answer:null,acceptedAnswers:[0,1],sourceIssue:'Self-check only.',legacyChoices:{'old-q1':[2,1,0]}};
const keyed={id:'REN-X-Q002',type:'mcq',page:4,question:'Synthetic stem two?',options:['One','Two'],answer:0,explanation:'Old'};
const pack={version:3,counts:{mcq:2,saq:1,ospe:0},questions:[selfCheck,keyed,{id:'w',type:'saq',page:5,question:'Write.'}]};
const item={page:3,stem:'synthetic stem one?',match:[['alpha','beta','gamma']],options:['Alpha','Beta','Corrected gamma'],answer:2,reasons:['No a','No b','Yes c'],explanation:'Reviewed explanation.'};
const overlay={version:1,course:'REN',items:{'REN-X-Q001':item}};

test('a reviewed item replaces the self-check key, choices, reasons and explanation and drops the source issue',()=>{
 const {pack:out,applied,skipped}=applyReviewedOverlay(pack,overlay,'REN');
 const q=out.questions[0];
 assert.equal(applied,1);assert.equal(skipped,0);
 assert.equal(q.answer,2);assert.deepEqual(q.acceptedAnswers,[2]);assert.deepEqual(q.options,item.options);
 assert.deepEqual(q.reasons,item.reasons);assert.equal(q.explanation,'Reviewed explanation.');assert.equal(q.reviewed,true);
 assert.equal('sourceIssue' in q,false);assert.deepEqual(q.legacyChoices,selfCheck.legacyChoices);
 assert.equal(out.questions[1],keyed);assert.equal(pack.questions[0].answer,null,'source pack is not mutated');
 assert.equal(validateActiveBooklet(out,meta),out);
});

test('a question whose served choices no longer match the reviewed source is left unchanged',()=>{
 const changed={...pack,questions:[{...selfCheck,options:['Alpha','Delta','Gamma']},keyed,pack.questions[2]]};
 const {pack:out,applied,skipped}=applyReviewedOverlay(changed,overlay,'REN');
 assert.equal(applied,0);assert.equal(skipped,1);assert.equal(out.questions[0].answer,null);
});

test('items match by page and stem when the served ID differs, and reworded stems or multiple keys apply',()=>{
 const renamed={...pack,questions:[{...selfCheck,id:'ren-booklet-p3-q1'},keyed,pack.questions[2]]};
 const o={...overlay,items:{'REN-X-Q001':{...item,question:'Clarified stem?',answer:0,accepted:[0,2]}}};
 const q=applyReviewedOverlay(renamed,o,'REN').pack.questions[0];
 assert.equal(q.id,'ren-booklet-p3-q1');assert.equal(q.question,'Clarified stem?');assert.deepEqual(q.acceptedAnswers,[0,2]);
});

test('malformed overlays and items are rejected or skipped',()=>{
 assert.throws(()=>applyReviewedOverlay(pack,{...overlay,course:'MOL'},'REN'));
 assert.throws(()=>applyReviewedOverlay(pack,{version:3,course:'REN',items:{}},'REN'));
 for(const bad of [{answer:5},{reasons:['x']},{explanation:''},{accepted:[0]},{options:['a','b']}]){
  assert.equal(applyReviewedOverlay(pack,{...overlay,items:{'REN-X-Q001':{...item,...bad}}},'REN').applied,0);
 }
});

test('a missing overlay leaves the pack as published, other failures are retried',async()=>{
 assert.equal(await fetchReviewedOverlay('/x',{fetcher:async()=>({status:404,ok:false})}),null);
 await assert.rejects(fetchReviewedOverlay('/x',{fetcher:async()=>({status:503,ok:false})}),/reviewed booklet answers/);
 assert.deepEqual(await fetchReviewedOverlay('/x',{fetcher:async()=>({status:200,ok:true,json:async()=>overlay})}),overlay);
 assert.match(reviewedOverlayPaths.REN,/^\/api\/site-assets\/materials\/ren123\//);assert.match(reviewedOverlayPaths.MOL,/^\/api\/site-assets\/materials\/mol114\//);
});

test('overlay assets are pinned privately and Booklet keeps feedback below the navigation',()=>{
 const pinned=JSON.parse(readFileSync(new URL('../lib/active-booklet-assets.json',import.meta.url),'utf8'));
 for(const path of Object.values(reviewedOverlayPaths)){
  const row=pinned.find(a=>'/api/site-assets/'+a.path===path);
  assert.ok(row&&/^[a-f0-9]{64}$/.test(row.sha)&&row.size>0,path);
 }
 const s=readFileSync(new URL('../public/phase2-practice.mjs',import.meta.url),'utf8');
 assert.match(s,/reviewedBookletLoader\('MOL'\)/);assert.match(s,/reviewedBookletLoader\('REN'\)/);assert.doesNotMatch(s,/Answer and explanation reviewed by Review Studio|REVIEWED_LABEL/);
 const markup=s.slice(s.indexOf('function bookMarkup'),s.indexOf('function repeatedSourceMarkup'));
 assert.match(markup,/data-report-placement/);
 assert.ok(markup.indexOf('class="answer-option')<markup.indexOf('id="p2prev"'));
 assert.ok(markup.indexOf('id="p2resume"')<markup.indexOf('class="answer-feedback"'));
});

test('a reconciled review pins the exact served ID, page, stem and options, and may replace the choice count',()=>{
 const itemV2={...item,options:['Alpha','Reviewed delta'],answer:1,reasons:['No a','Yes d']};
 const reconciled={...overlay,version:2,items:{[selfCheck.id]:itemV2}};
 const {pack:out,applied,skipped}=applyReviewedOverlay(pack,reconciled,'REN');
 assert.deepEqual([applied,skipped],[1,0]);
 const q=out.questions[0];
 assert.deepEqual(q.options,itemV2.options);
 assert.deepEqual(q.previousOptions,selfCheck.options);
 assert.equal(q.choiceRevision,'reviewed-v2');
 assert.deepEqual(q.legacyChoices,selfCheck.legacyChoices);
 assert.equal(validateActiveBooklet(out,meta),out);
 for(const changed of [{page:6},{question:'Changed stem?'},{options:['Beta','Alpha','Gamma']}]){
  const source={...pack,questions:[{...selfCheck,...changed},...pack.questions.slice(1)]};
  assert.equal(applyReviewedOverlay(source,reconciled,'REN').skipped,1);
 }
 const renamed={...pack,questions:[{...selfCheck,id:'different-id'},...pack.questions.slice(1)]};
 assert.equal(applyReviewedOverlay(renamed,reconciled,'REN').applied,0);
});

test('saved results remain historical when an old choice is replaced and fresh responses use reviewed choices',async()=>{
 const {bookletEntry}=await import('../public/phase2-practice-core.mjs');
 const {bookletCheckResult}=await import('../public/phase2-practice.mjs');
 const o={...overlay,version:2,items:{[selfCheck.id]:{...item,options:['Beta','Alpha','Reviewed gamma'],answer:2}}};
 const q=applyReviewedOverlay(pack,o,'REN').pack.questions[0];
 const old={answer:0,correct:true,completed:true};
 assert.deepEqual(bookletEntry(q,{[q.id]:old}),{...old,answer:1,previousResult:true,priorChoice:'Alpha'});
 assert.deepEqual(bookletEntry(q,{'old-q1':old}),{...old,answer:undefined,previousResult:true,priorChoice:'Gamma'});
 const fresh=bookletCheckResult(q,2,'2026-11-25');
 assert.equal(fresh.choiceRevision,'reviewed-v2');
 assert.equal(bookletEntry(q,{[q.id]:fresh}).answer,2);
 assert.equal(bookletEntry(q,{[q.id]:fresh}).previousResult,undefined);
 assert.deepEqual(old,{answer:0,correct:true,completed:true});
});
