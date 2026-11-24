import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const source=read('study-reliability.js'),core=read('study-reliability-core.js');
function harness(){
 let archive=[],fail=false,finished=0,recorded=0,notices=[];
 const q={id:'q',question:'Synthetic',options:['A','B'],answer:0};
 const ctx={StudyVault:{read:()=>({answerReceipts:archive}),set:(k,value)=>{if(fail)throw Error('quota');archive=value.answerReceipts}},toast:s=>notices.push(s),etExam:{id:'mock',questions:[q],answers:{0:0}},originalRun:null,etFinishExam(){finished++},saveOriginalRun(){},originalGrade:()=>({fallback:true}),originalQuestionMarkup:q=>q,etRecordSet(){recorded++;return 1},etMockResults:()=>'',originalWorkspace:()=>'',crypto:{randomUUID:()=> 'set'}};
 const code=source.slice(source.indexOf(' function receiptRead()'),source.indexOf(' function icon('));
 const api=runInNewContext(core+code+'\n({saveReceipt,makeReceipt,originalReceipt,receiptForExport,receiptButton,receipt:StudioReliability.receipt})',ctx);
 return {api,ctx,q,notices,fail:v=>fail=v,archive:()=>archive,finished:()=>finished,recorded:()=>recorded};
}
test('receipt archive quota failure never blocks primary mock or set submission',()=>{
 const h=harness();h.fail(true);h.ctx.etFinishExam('submitted');
 assert.equal(h.finished(),1);assert.equal(h.ctx.etExam.receipt.correct,1);
 assert.equal(h.ctx.etRecordSet([h.q],{0:0},'Practice'),1);assert.equal(h.recorded(),1);
 assert.equal(h.notices.length,2);
 assert.equal(h.api.receiptForExport('mock'),h.ctx.etExam.receipt);
});
test('oversized single receipt cannot evict the existing archive or exceed its bound',()=>{
 const h=harness(),r=h.api.receipt('keep','mock',[h.q],{0:0});assert.equal(h.api.saveReceipt(r),true);
 const large=h.api.receipt('oversized','mock',[{...h.q,question:'a'.repeat(1800001)}],{0:0});
 assert.equal(h.api.saveReceipt(large),false);assert.equal(h.archive().length,1);assert.equal(h.archive()[0].id,'keep');
});
test('invalid original receipt is not used to override original grading',()=>{
 const h=harness(),run={setId:'s',startedAt:'2026-11-24',finishedAt:'2026-11-25',receipt:h.api.receipt('original:s:2026-11-24','original',[h.q],{q:0})};
 assert.equal(h.ctx.originalGrade(run).correct,1);
 run.receipt={...run.receipt,correct:0};assert.equal(h.ctx.originalGrade(run).fallback,true);
 assert.equal(h.api.receiptButton(run.receipt),'');
});
test('startup metrics tolerate corrupt storage and calculate an actual even-sample median',()=>{
 const start=source.indexOf(' function performanceSamples()'),end=source.indexOf(" window.addEventListener('studio-ready'",start),out={};let raw='broken-json';
 const api=runInNewContext(source.slice(start,end)+'\n({paintPerformance,performanceSamples})',{localStorage:{getItem:()=>raw},$:()=>out});
 api.paintPerformance();assert.match(out.textContent,/Available after/);assert.equal(api.performanceSamples(),null);
 raw=JSON.stringify([{ready:1000},{ready:3000},{ready:-1},{ready:'500'}]);api.paintPerformance();assert.match(out.textContent,/median: 2.00 s/);assert.match(out.textContent,/2 recent launches/);
});
