import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="function originalQuestionMarkup(q,i){const run=originalRun,done=!!run.finishedAt,answer=Object.hasOwn(q,'receiptSelected')?q.receiptSelected:run.answers[q.id],source=ORIGINAL_EXAMS.sources.find(s=>s.id===q.source);let html=`<article class=\"original-question\" data-question-id=\"${esc(q.id)}\" data-question-context=\"${done?'review':'active-exam'}\" id=\"original-question-${i}\"><div class=\"section-head\"><span class=\"pill\">${i+1}${q.repeatLabel?\"\":\" · Original \"+esc(q.number)}</span><span class=\"question-kind\">${q.type==='mcq'?(q.repeatLabel?'Adapted MCQ':'Original MCQ'):'Short answer · self-check'}</span></div>${repeatBadge(q)}${q.caseText?`<div class=\"original-case\"><b>Original case context</b><p>${esc(q.caseText)}</p></div>`:''}<h3>${esc(q.question)}</h3>${q.figures.map(raw=>{const f={...raw,image:done&&raw.revealedImage?raw.revealedImage:raw.image};return `<figure class=\"original-question-figure\"><a href=\"${esc(f.image)}\" target=\"_blank\" rel=\"noopener noreferrer\"><img loading=\"lazy\" src=\"${esc(f.image)}\" alt=\"Original figure for this question · source page ${f.page}\"></a><figcaption>${f.label?'Option '+esc(f.label):'Question figure'} · source p${f.page}</figcaption></figure>`}).join('')}${q.options.length?`<div class=\"answer-options\">${q.options.map((o,j)=>`<label class=\"answer-option ${done&&Number.isInteger(q.answer)?j===q.answer?'correct':j===answer?'incorrect':'':''}\"><input type=\"radio\" name=\"original-answer-${i}\" data-original-answer=\"${esc(q.id)}\" value=\"${j}\" ${answer===j?'checked':''} ${done?'disabled':''}><span class=\"option-letter\">${esc(q.letters[j])}</span><span>${esc(o)}</span></label>`).join('')}</div>`:`<label>Your answer<textarea data-original-written=\"${esc(q.id)}\" ${done?'readonly':''} rows=\"3\">${esc(typeof answer==='string'?answer:'')}</textarea></label>`}${done?`<div class=\"answer-feedback ${Number.isInteger(q.answer)&&answer===q.answer?'success':Number.isInteger(answer)?'retry':'ungraded'}\"><b>${Number.isInteger(q.answer)?!Number.isInteger(answer)?'Unanswered · not graded':answer===q.answer?(q.repeatLabel?'Correct':q.sourceIssue?.includes('printed key is incorrect')?'Matches the reviewed key':'Matches the printed key'):(q.repeatLabel?'Incorrect':q.sourceIssue?.includes('printed key is incorrect')?'Does not match the reviewed key':'Does not match the printed key'):'Self-check · no usable letter key'}</b>${q.sourceIssue?`<p class=\"notice\">${esc(q.sourceIssue)}</p>`:''}${q.sourceIssue?.includes('printed key is incorrect')&&Number.isInteger(q.answer)?`<p><b>Reviewed answer:</b> ${esc(q.letters[q.answer])} · ${esc(q.options[q.answer])}</p>`:''}<p><b>${q.repeatLabel?\"Reviewed answer\":\"Printed answer\"}:</b> ${esc(q.printedAnswer||'No answer was supplied.')}</p>${q.sourceExplanation?`<p><b>${q.repeatLabel?\"Explanation\":\"Source explanation\"}:</b> ${esc(q.sourceExplanation)}</p>`:''}${q.reviewedExplanation?`<div class=\"reviewed-note\"><b>Reviewed study note · separate from the original</b><p>${esc(q.reviewedExplanation)}</p>${q.reviewedAnswer?`<p><b>Reviewed answer:</b> ${esc(q.reviewedAnswer)}</p>`:''}</div>`:''}</div>`:''}${q.sourceRefs?(done?`<p class=\"source-links\">Past-paper references: ${esc(q.sourceRefs)}</p>`:\"\"):`<div class=\"source-links\"><a href=\"${esc(source.url)}#page=${q.page}\" target=\"_blank\" rel=\"noopener noreferrer\">${esc(source.linkLabel||'Original PDF')} · p${q.page}${q.endPage>q.page?'–'+q.endPage:''} ↗</a></div>`}</article>`;return decorateOptions(html,q)}";
const candidate=readFileSync(new URL('../public/original-exams.js',import.meta.url),'utf8').split('\n').find(x=>x.startsWith('function originalQuestionMarkup('));
const sourceContent=readFileSync(new URL('../public/original-exams.js',import.meta.url),'utf8');
function fixture(source,n=1000){
 let sourceIdReads=0;
 const sources=Array.from({length:1200},(_,i)=>({get id(){sourceIdReads++;return 'source'+i},url:'/api/materials/'+i,title:'Source '+i,linkLabel:'Original PDF'}));
 sources.unshift({id:'source700',url:'/api/materials/first-700',title:'First 700',linkLabel:'Original PDF'});
 const questions=Array.from({length:n},(_,i)=>({id:'q'+i,number:i+1,source:i%13===0?'source700':'source'+((i*37)%1200),type:'mcq',question:'Question '+i,options:['Option A','Option B'],letters:['A','B'],answer:0,printedAnswer:'A',figures:[],page:i%400+1,sourceRefs:null}));
 const run={finishedAt:null,answers:Object.fromEntries(questions.map(q=>[q.id,0]))};
 const ctx=vm.createContext({window:{},ORIGINAL_EXAMS:{sources},originalRun:run,repeatBadge:()=>'',decorateOptions:(html)=>html,esc:String});
 vm.runInContext(source+'\nthis.markup=originalQuestionMarkup',ctx);
 const lookup=new Map();for(const s of sources)if(!lookup.has(s.id))lookup.set(s.id,s);
 return {questions,run,markup:ctx.markup,lookup,reads:()=>sourceIdReads};
}
const median=fn=>{fn();const v=[];for(let i=0;i<7;i++){const start=performance.now();fn();v.push(performance.now()-start)}return v.sort((a,b)=>a-b)[3]};
test('A5-156 first-match source precedence, answer status and markup match original exams',()=>{
 for(const n of [1,12,200]){const a=fixture(baseline,n),b=fixture(candidate,n);for(const done of [false,true]){
  a.run.finishedAt=b.run.finishedAt=done?'2026-11-24T00:00:00Z':null;
  assert.deepEqual(b.questions.map((q,i)=>b.markup(q,i,b.lookup)),a.questions.map((q,i)=>a.markup(q,i)));
  assert.equal(b.markup(b.questions[0],0),a.markup(a.questions[0],0));
 }}
 assert.match(sourceContent,/sourceLookup=qs\.length>=12\?new Map\(\):null/);
 assert.match(sourceContent,/qs\.map\(\(q,i\)=>originalQuestionMarkup\(q,i,sourceLookup\)\)/);
});
test('A5-156 large original exam source lookups benchmark',()=>{
 const a=fixture(baseline),b=fixture(candidate);
 assert.deepEqual(b.questions.map((q,i)=>b.markup(q,i,b.lookup)),a.questions.map((q,i)=>a.markup(q,i)));
 const beforeReads=a.reads(),afterReads=b.reads();
 const baselineMedianMs=median(()=>a.questions.map((q,i)=>a.markup(q,i)));
 const candidateMedianMs=median(()=>b.questions.map((q,i)=>b.markup(q,i,b.lookup)));
 assert.ok(afterReads<beforeReads);
 console.log(JSON.stringify({label:'A5-156 original exam source metadata',baselineMedianMs,candidateMedianMs,baselineSourceIdReads:beforeReads,candidateSourceIdReads:afterReads,questions:a.questions.length,sources:1201}));
});
