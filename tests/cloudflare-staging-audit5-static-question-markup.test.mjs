import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const baseline="function etQuestionMarkup(q,i,answers,finished,prefix,extra=''){const value=answers[i],ok=value===q.answer;return `<article class=\"et-question ${finished?(ok?'et-correct':Number.isInteger(value)?'et-incorrect':'et-unanswered'):''}\" data-question-id=\"${esc(q.id)}\" data-question-context=\"${finished?'review':prefix==='mock'?'active-exam':'practice'}\" id=\"${prefix}-question-${i}\"><div class=\"section-head\"><span class=\"pill\">${i+1} · ${esc(q.lectureIds.join(' / '))}</span>${extra}</div><h3>${esc(q.question)}</h3>${q.image?`<img class=\"et-question-image\" src=\"${esc(q.image)}\" alt=\"${esc(q.imageAlt||'Question figure')}\">`:''}<div class=\"answer-options\">${q.options.map((o,j)=>`<label class=\"answer-option ${finished?(j===q.answer?'correct':j===value?'incorrect':''):''}\"><input type=\"radio\" name=\"${prefix}-${i}\" data-et-answer=\"${i}\" data-et-mode=\"${prefix}\" value=\"${j}\" ${value===j?'checked':''} ${finished?'disabled':''}><span class=\"option-letter\">${String.fromCharCode(65+j)}</span><span>${esc(o)}</span></label>`).join('')}</div>${esc(q.kind||'Explained question')?`<p class=\"et-question-kind question-kind-foot\">${esc(q.kind||'Explained question')}</p>`:''}${finished?`<div class=\"et-explanation\"><strong>${ok?'Correct':Number.isInteger(value)?'Review this answer':'Unanswered · not graded'}</strong><p>${esc(q.explanation)}</p>${q.explanationFigure?guideFigure(q.explanationFigure,\"Explanation diagram\"):\"\"}<details><summary>${q.reasons?.some(Boolean)?'Why each option fits or fails':'Source key · no option rationales supplied'}</summary>${q.options.map((o,j)=>`<p><b>${String.fromCharCode(65+j)}. ${esc(o)}</b><br>${esc(q.reasons?.[j]||'')}</p>`).join('')}</details>${q.adaptationNote?`<details class=\"repair-note\"><summary>Question repair and original wording</summary><p>${esc(q.adaptationNote)}</p>${q.originalQuestion?`<p><b>Original stem:</b> ${esc(q.originalQuestion)}</p>`:''}${q.originalOptions?.length?`<ol type=\"A\">${q.originalOptions.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}</details>`:''}<div class=\"source-links\">${(q.references||[]).map(r=>typeof sourceLink==='function'?sourceLink(r):'').join('')}</div></div>`:''}</article>`}";
const file=readFileSync(new URL('../public/exam-tools.js',import.meta.url),'utf8');
const begin=file.indexOf('const etQuestionStatic=new WeakMap();');
const end=file.indexOf('\nfunction etQuestionMarkup(',begin);
const candidate=file.slice(begin,end)+'\n'+file.split('\n').find(s=>s.startsWith('function etQuestionMarkup('));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fixture(source){let escCalls=0;const ctx=vm.createContext({window:{},esc:s=>{escCalls++;return escapeHTML(s)},guideFigure:()=>'<figure>Image</figure>',sourceLink:r=>'<a>'+r.source+'</a>'});vm.runInContext(source+'\nthis.run=etQuestionMarkup',ctx);return {run:ctx.run,calls:()=>escCalls}}
const make=i=>({id:'q'+i,lectureIds:['REN-A'+i%10],kind:i%2?'Lecture check':'Past paper',question:'Describe the process < and > '+i+' '.repeat(2000),options:Array.from({length:5},(_,j)=>'Option '+j+' & physiology '+('repeat '.repeat(50))),reasons:['Correct rationale','Incorrect','','',''],answer:0,explanation:'Detailed answer < and &',image:i%7===0?'/diagram.png':null,imageAlt:'Renal anatomy <diagram>',references:[{source:'REN-123'}],adaptationNote:i%10===0?'Repair note':null,originalQuestion:'Original?',originalOptions:['a','b']});
const norm=x=>JSON.parse(JSON.stringify(x));
const median=fn=>{fn();const times=[];for(let i=0;i<7;i++){const start=performance.now();fn();times.push(performance.now()-start)}return times.sort((a,b)=>a-b)[3]};
test('A5-144 static stem/options caching preserves all UI paths and in-place source edits',()=>{
 const a=fixture(baseline),b=fixture(candidate),q=make(3);for(const finished of [false,true])for(const prefix of ['mock','concept','imported'])for(const extra of ['','<button>flag</button>'])for(const answer of [undefined,0,1]){
  const answers=answer===undefined?{}:{0:answer};
  assert.equal(b.run(q,0,answers,finished,prefix,extra),a.run(q,0,answers,finished,prefix,extra));
 }
 for(const mutation of [()=>q.question='Changed <stem>',()=>q.options[1]='New option >',()=>q.kind='Updated kind',()=>q.image='/new.png',()=>q.imageAlt='Another caption']){mutation();assert.equal(b.run(q,2,{2:1},true,'mock'),a.run(q,2,{2:1},true,'mock'))}
 const q2=make(4);assert.equal(b.run(q2,5,{},false,'mock'),a.run(q2,5,{},false,'mock'));
});
test('A5-144 repeated 200-question markup benchmark and sanitization call counts',()=>{
 const a=fixture(baseline),b=fixture(candidate),qs=Array.from({length:200},(_,i)=>make(i));
 const run=f=>qs.map((q,i)=>f.run(q,i,{},false,'mock')).join('');
 assert.equal(run(a),run(b));
 const beforeA=a.calls(),beforeB=b.calls();run(a);run(b);
 const baselineCalls=a.calls()-beforeA,candidateCalls=b.calls()-beforeB;
 assert.ok(candidateCalls<baselineCalls);
 const baselineMedianMs=median(()=>run(a)),candidateMedianMs=median(()=>run(b));
 console.log(JSON.stringify({label:'A5-144 exam static markup',baselineMedianMs,candidateMedianMs,baselineEscapingCalls:baselineCalls,candidateEscapingCalls:candidateCalls,questions:qs.length}));
});
