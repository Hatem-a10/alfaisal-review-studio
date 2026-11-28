'use strict';
const optionStrikesKey=KEY+'-option-strikes-v1';let optionStrikes={};try{const raw=JSON.parse(localStorage.getItem(optionStrikesKey)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))optionStrikes=raw}catch{}
function decorateOptions(html,q){let letter=0,h=2166136261;for(const c of q.question||q.options.join('|'))h=Math.imul(h^c.charCodeAt(0),16777619);const strikeId=q.id||'imported-'+(h>>>0).toString(16);return html.replace(/<label class="answer-option([^\"]*)">([\s\S]*?)<\/label>/g,(all,cls,inner)=>{const n=/value="(\d+)"/.exec(inner);if(!n)return all;const value=q.options[+n[1]]||q.letters?.[+n[1]]||String(+n[1]),struck=(optionStrikes[strikeId]||[]).includes(value),label=String.fromCharCode(65+letter++);return `<div class="mcq-option-row ${struck?'option-struck':''}"><label class="answer-option${cls}">${inner}</label><button type="button" class="strike-option" data-strike-q="${esc(strikeId)}" data-strike-value="${esc(value)}" aria-pressed="${struck}" aria-label="${struck?'Unstrike':'Strike out'} option ${label}" title="${struck?'Restore this option':'Strike out this option'}">${struck?'Undo':'Strike'}</button></div>`})}
const originalConceptQuestionMarkup=conceptQuestionMarkup;conceptQuestionMarkup=function(q,i,b){return decorateOptions(originalConceptQuestionMarkup(q,i,b),q)};
const originalEtQuestionMarkup=etQuestionMarkup;etQuestionMarkup=function(q,i,a,f,p,e=''){return decorateOptions(originalEtQuestionMarkup(q,i,a,f,p,e),q)};
let originalRun=null,originalCatalog,resetOriginalCatalog,originalBrowseOnly=false;const originalRunKey=KEY+'-original-exam-run-v1';try{const r=JSON.parse(localStorage.getItem(originalRunKey)||'null');if(r&&Array.isArray(r.ids)&&r.ids.length<=800&&r.answers&&typeof r.answers==='object')originalRun=r}catch{}
const originalRunsKey=KEY+'-original-exam-runs-v1';let originalRuns={};try{const a=JSON.parse(localStorage.getItem(originalRunsKey)||'{}');if(a&&typeof a==='object'&&!Array.isArray(a))originalRuns=a}catch{}if(originalRun)originalRuns[originalRun.setId]=originalRun;let originalSavedRun=originalRun;
function saveOriginalRun(){if(originalRun)originalRun.updatedAt=new Date().toISOString();const excluded=!!originalRun&&originalLowScore(originalRun);if(originalRun?.finishedAt)originalRun.excludedLowScore=excluded;originalSavedRun=excluded?null:originalRun;if(originalRun){if(excluded)delete originalRuns[originalRun.setId];else originalRuns[originalRun.setId]=originalRun}try{localStorage.setItem(originalRunsKey,JSON.stringify(originalRuns));if(originalRun&&!excluded)localStorage.setItem(originalRunKey,JSON.stringify(originalRun));else localStorage.removeItem(originalRunKey)}catch{toast('This device could not save the exam. Keep the page open.')}}
// Validate saved IDs before the private assessment pack is fetched.
function deferredOriginalQuestion(setId,id){
 if(typeof setId!=='string'||typeof id!=='string')return false;
 if(setId==='ren-19-anzhelika-practice')return /^ren-19-anzhelika-\d+-[a-f0-9]{16}$/.test(id);
 if(/^ren-(?:14|16|17|18)-tbl-[1-3]$/.test(setId))return id.startsWith(setId+'-')&&/^(?:mcq|cs)-[1-9]\d*$/.test(id.slice(setId.length+1));
 const renalFinal=setId.match(/^(ren-(?:12|14|16|17)-final)(?:-(saq|ospe))?$/);
 if(renalFinal){
  const [,paper,part='mcq']=renalFinal;
  const prefix=paper+'-'+part+'-';
  if(!id.startsWith(prefix))return false;
  const number=id.slice(prefix.length);
  return part==='saq'?/^[1-9]\d*-[1-9]\d*$/.test(number):/^[1-9]\d*(?:-p[1-9]\d*-[1-9]\d*)?$/.test(number);
 }
 if(/^ren-18-collection(?:-saq|-ospe)?$/.test(setId)){
  const part=setId==='ren-18-collection'?'mcq':setId.split('-').at(-1);
  return id.startsWith('ren-18-collection-'+part+'-')&&/^[1-9]\d*$/.test(id.split('-').at(-1))&&id.split('-').length===5;
 }
 if(/^mol-(?:14|16|17|18)-final$/.test(setId))return id.startsWith(setId+'-')&&/^p[1-9]\d*-item[1-9]\d*$/.test(id.slice(setId.length+1));
 return false;
}
function examSetTitle(set){return settings.examNames?.[set?.id]||set?.title||'Original question set'}
function originalQuestionById(id){return ORIGINAL_EXAMS.questions.find(q=>q.id===id)}
function originalGrade(run){const byId=new Map(ORIGINAL_EXAMS.questions.map(q=>[q.id,q])),qs=run.ids.map(id=>byId.get(id)).filter(Boolean),valid=(q,v)=>Number.isInteger(v)&&Array.isArray(q.options)&&v>=0&&v<q.options.length,keyed=qs.filter(q=>q.type==='mcq'&&valid(q,q.answer)),answered=keyed.filter(q=>valid(q,run.answers[q.id])),correct=keyed.filter(q=>run.answers[q.id]===q.answer).length;return {total:qs.length,keyed:keyed.length,answered:answered.length,correct,percent:answered.length?Math.round(correct/answered.length*1000)/10:0,ungraded:qs.length-keyed.length}}
function originalLowScore(run){if(!run?.finishedAt)return false;const g=originalGrade(run);if(g.total!==run.ids.length)return false;return g.keyed>0&&(!g.answered||g.correct*100<g.answered*15)}
function repeatBadge(q) {
 return q.repeatLabel ? `<span class="cvp-repeat-badge" data-repeat="${esc(q.repeat)}">${esc(q.repeatLabel)}</span>` : '';
}
function originalOptionLabel(q,text){
 return /^ren-19-anzhelika-/.test(q.source||'') && /^[a-z]{3}/.test(text) && text===text.toLowerCase()
  ? text[0].toUpperCase()+text.slice(1) : text;
}
function originalFigureMarkup(f,web){
 const description=f.alt||f.caption||'Original figure for this question · source page '+f.page;
 const caption=web?f.caption:f.label?'Option '+f.label+' · source p'+f.page:'Question figure · source p'+f.page;
 return `<figure class="original-question-figure"><a href="${esc(f.image)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(f.image)}" alt="${esc(description)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
}
function originalQuestionMarkup(q,i,sourceLookup){const run=originalRun,done=!!run.finishedAt,answer=Object.hasOwn(q,'receiptSelected')?q.receiptSelected:run.answers[q.id],source=sourceLookup?sourceLookup.get(q.source):ORIGINAL_EXAMS.sources.find(s=>s.id===q.source);let html=`<article class="original-question" data-question-id="${esc(q.id)}"${window.reviewReportAttrs?.(q,{paper:originalRun.setId})||''} data-question-context="${done?'review':'active-exam'}" id="original-question-${i}"><div class="section-head"><span class="pill">${i+1}${q.repeatLabel?"":" · Original "+esc(q.number)}</span><span class="question-kind">${q.type==='mcq'?(q.repeatLabel?'Adapted MCQ':'Original MCQ'):'Short answer · self-check'}</span></div>${repeatBadge(q)}${q.caseText?`<div class="original-case"><b>Original case context</b><p>${esc(q.caseText)}</p></div>`:''}<h3>${esc(q.question)}</h3>${q.figures.map(raw=>originalFigureMarkup({...raw,image:done&&raw.revealedImage?raw.revealedImage:raw.image},source?.web)).join('')}${q.options.length?`<div class="answer-options">${q.options.map((o,j)=>`<label class="answer-option ${done&&Number.isInteger(q.answer)?j===q.answer?'correct':j===answer?'incorrect':'':''}"><input type="radio" name="original-answer-${i}" data-original-answer="${esc(q.id)}" value="${j}" ${answer===j?'checked':''} ${done?'disabled':''}><span class="option-letter">${esc(q.letters[j])}</span><span>${esc(q.source?.startsWith('ren-19-anzhelika-')?originalOptionLabel(q,o):o)}</span></label>`).join('')}</div>`:`<label>Your answer<textarea data-original-written="${esc(q.id)}" ${done?'readonly':''} rows="3">${esc(typeof answer==='string'?answer:'')}</textarea></label>`}${done?`<div class="answer-feedback ${Number.isInteger(q.answer)&&answer===q.answer?'success':Number.isInteger(answer)?'retry':'ungraded'}"><b>${Number.isInteger(q.answer)?!Number.isInteger(answer)?'Unanswered · not graded':answer===q.answer?(q.repeatLabel||source?.web?'Correct':q.sourceIssue?.includes('printed key is incorrect')?'Matches the reviewed key':'Matches the printed key'):(q.repeatLabel||source?.web?'Incorrect':q.sourceIssue?.includes('printed key is incorrect')?'Does not match the reviewed key':'Does not match the printed key'):'Self-check · no usable letter key'}</b>${q.sourceIssue?`<p class="notice">${esc(q.sourceIssue)}</p>`:''}${q.sourceIssue?.includes('printed key is incorrect')&&Number.isInteger(q.answer)?`<p><b>Reviewed answer:</b> ${esc(q.letters[q.answer])} · ${esc(q.options[q.answer])}</p>`:''}<p><b>${source?.web?"Instructor’s answer":q.repeatLabel?"Reviewed answer":"Printed answer"}:</b> ${esc(q.printedAnswer||'No answer was supplied.')}</p>${q.sourceExplanation?`<p><b>${q.repeatLabel?"Explanation":"Source explanation"}:</b> ${esc(q.sourceExplanation)}</p>`:''}${(q.reviewFigures||[]).map(f=>originalFigureMarkup(f,source?.web)).join('')}${q.reviewedExplanation?`<div class="reviewed-note"><b>Reviewed study note · separate from the original</b><p>${esc(q.reviewedExplanation)}</p>${q.reviewedAnswer?`<p><b>Reviewed answer:</b> ${esc(q.reviewedAnswer)}</p>`:''}</div>`:''}</div>`:''}${q.sourceRefs?(done?`<p class="source-links">Past-paper references: ${esc(q.sourceRefs)}</p>`:""):/^ren-(?:12|14|16|17)-final$/.test(q.source)?`<p class="source-links">Source page ${esc(q.page)}</p>`:`<div class="source-links"><a href="${esc(source.url)}${source.web?'':'#page='+q.page}" target="_blank" rel="noopener noreferrer">${esc(source.linkLabel||'Original PDF')} · ${source.web?'Question ':'p'}${q.page}${q.endPage>q.page?'–'+q.endPage:''} ↗</a></div>`}</article>`;return decorateOptions(html,q)}
const assessmentLoads=new Map();
function loadCourseAssessments(course){
 const config=window.reviewCourseConfig?.(course);
 if(!config?.assessmentPath||['loading','ready'].includes(assessmentLoads.get(course)))return;
 assessmentLoads.set(course,'loading');
 if(course==='MOL'){
  const midterm=ORIGINAL_EXAMS.sets.find(set=>set.id==='mol-exam-1');
  if(midterm){midterm.batch=18;midterm.title='18th batch · recalled MOL midterm';}
  for(const set of ORIGINAL_EXAMS.sets)if(['mol-exam-1','mol-exam-2','mol-exam-16'].includes(set.id))set.sourceInAssessment=true;
 }
 fetch('/api/site-assets/'+config.assessmentPath+(course==='REN'?'?v=3':'')).then(response=>{
  if(!response.ok)throw Error('Assessments could not load.');
  return response.json();
 }).then(data=>{
  if(data.version!==1||!data.sets?.length||!data.questions?.length||!data.sources?.length)throw Error('Assessments were incomplete.');
  for(const [key,items] of Object.entries({
   sets:data.sets.map(set=>({...set,course,sourceInAssessment:true})),
   questions:data.questions.map(question=>{
    const final=question.id.match(/^ren-(?:12|14|16|17)-final-(?:mcq|ospe|saq)-([1-9]\d*(?:-[1-9]\d*)?)(?:-p[1-9]\d*-[1-9]\d*)?$/);
    return final?{...question,number:final[1]}:question;
   }),
   sources:data.sources,
  })){
   const existing=new Set(ORIGINAL_EXAMS[key].map(item=>item.id));
   ORIGINAL_EXAMS[key].push(...items.filter(item=>!existing.has(item.id)));
  }
  assessmentLoads.set(course,'ready');
 }).catch(error=>{console.error(error);assessmentLoads.set(course,'error');window.reviewAutoRetry?.schedule('assessments-'+course,()=>{assessmentLoads.delete(course);loadCourseAssessments(course)})}).finally(()=>{
  if(view==='practice'&&etPracticeTab==='original')render();
 });
}
function resetOriginalView(){originalBrowseOnly=true;resetOriginalCatalog?.();if(typeof originalReviewFilter!=='undefined')originalReviewFilter='all'}
function visibleOriginalRun(){return !originalBrowseOnly&&availableOriginalRun()}
function availableOriginalRun(){
 const set=ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun?.setId);
 if(!originalRun||!set)return false;
 const scope=globalThis.reviewCourseScope;
 if(set.course==='REN'||scope==='REN')return scope===set.course;
 if(scope==='CVP')return globalThis.reviewArchivedStudyItem?.(set)===true;
 return !globalThis.reviewArchivedStudyItem?.(set);
}
function instructorSet(set){return set?.id==='ren-19-anzhelika-practice'}
const originalCountCache=new WeakMap();
function originalAnswerCount(run,reset=false){const cached=originalCountCache.get(run);if(!reset&&cached?.answers===run.answers)return cached.count;const entry={answers:run.answers,count:Object.keys(run.answers).length};originalCountCache.set(run,entry);return entry.count}
function originalTrackAnswer(run,key,value){const count=originalAnswerCount(run),had=Object.hasOwn(run.answers,key);run.answers[key]=value;if(!had)originalCountCache.get(run).count=count+1}
function originalWorkspace(){
 const course=globalThis.reviewCourseScope||(globalThis.reviewCvpArchived?.()?'MOL':null);
 if(course&&!assessmentLoads.has(course))loadCourseAssessments(course);
 const status=assessmentLoads.get(course);
 if(course==='REN'&&status==='loading')return '<p role="status">Loading Renal assessments…</p>';
 if(course==='REN'&&status==='error')return '<p role="status">Could not load Renal assessments. <button data-retry-assessments="REN">Retry</button></p>';
 if(typeof originalCatalog!=='function'){
 originalCatalog??=Promise.all([import('/original-catalog.mjs?v=9'),import('/cvp-final-mock-data.mjs'),import('/cvp-past-papers.mjs')]).then(([catalog, mock, papers])=>{
  mock.registerCvpMock(ORIGINAL_EXAMS);
  papers.registerCvpPapers(ORIGINAL_EXAMS);
  window.Cvp19?.applyOriginal();
  originalCatalog=catalog.catalog;resetOriginalCatalog=catalog.resetCatalog;
  render();
 },()=>{originalCatalog=null});
 return '<p role="status">Loading exam sets…</p>';
 }if(visibleOriginalRun()){originalAnswerCount(originalRun,true);const set=ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId),grade=originalGrade(originalRun),qs=originalRun.ids.map(originalQuestionById).filter(Boolean),done=!!originalRun.finishedAt,sourceLookup=qs.length>=12?new Map():null;if(sourceLookup)for(const source of ORIGINAL_EXAMS.sources)if(!sourceLookup.has(source.id))sourceLookup.set(source.id,source);if(qs.length!==originalRun.ids.length)return '<section class="panel"><p role="status">Some saved exam questions are not loaded. Your saved answers are retained. Reload the page to load the complete question bank.</p><button type="button" data-reload-original>Reload question bank</button><button id="originalClose">Return to original sets</button></section>';return `<section class="panel original-run"><span class="eyebrow muted">${instructorSet(set)?"REN 123 · INSTRUCTOR PRACTICE":set?.adapted?"ADAPTED PRACTICE MOCK":"ORIGINAL WORDING · ORIGINAL ORDER"}</span><div class="section-head"><h2>${esc(examSetTitle(set))}</h2>${window.reviewAdmin===true?`<button type="button" data-rename-set="${esc(set?.id||'')}">✎ Rename</button>`:''}<button id="originalClose">${done?'Back to original sets':'Save & return to sets'}</button></div>${settings.examNames?.[set?.id]?`<p class="section-sub">Source: ${esc(set.title)}</p>`:''}<p class="muted">${instructorSet(set)?"Answers and source explanations are shown after submission.":set?.adapted?"Colors show matches in batches 14–18. References and answers appear after submission.":"Wording and options are preserved, including incomplete recalled questions. Line breaks are normalized. Source PDFs are authoritative."}</p>${done?`${grade.answered?scoreRing(Math.round(grade.correct*10000/grade.answered)/100,set?.adapted?'Mock score':instructorSet(set)?'Practice score':'Printed-key score',grade.correct+' / '+grade.answered+' answered MCQs'):'<div class="notice">No answered, keyed MCQs · unanswered and written items are ungraded.</div>'}${originalRun.excludedLowScore?'<p class="notice">Below 15% · this result is shown for review only and was not saved.</p>':''}<p class="section-sub">${grade.ungraded} items need self-checking. ${grade.keyed-grade.answered} unanswered MCQs were not graded. ${instructorSet(set)?"This score follows the instructor’s answer key.":"This score follows the supplied printed key, which may contain mistakes."} It does not change readiness or review completion.</p>`:`<p id="originalAnswered" class="muted">${originalAnswerCount(originalRun)} / ${qs.length} responses saved on this device.</p>`}<div class="original-jumps">${qs.map((q,i)=>`<button type="button" data-original-jump="${i}" aria-label="Jump to question ${i+1}">${i+1}</button>`).join('')}</div>${qs.map((q,i)=>originalQuestionMarkup(q,i,sourceLookup)).join('')}<div class="original-submit">${done?'<button id="originalRetry" class="primary">Retry this original set</button>':'<button id="originalSubmit" class="primary">Finish & review answers</button>'}</div></section>`}const msg=course==='MOL'?(status==='loading'?'<p role="status">Loading MOL assessments…</p>':status==='error'?'<p role="status">Could not load the added MOL assessments. <button data-retry-assessments="MOL">Retry</button></p>':''):'';
 return msg+originalCatalog()}
etPracticeWorkspace=function(){return `<div class="et-practice-tabs"><button data-et-tab="mock" class="${etPracticeTab==='mock'?'selected':''}">Timed mock exam ${etExam&&!etExam.finishedAt?'· running':''}</button><button data-et-tab="sets" class="${etPracticeTab==='sets'?'selected':''}">Concept question sets</button><button data-et-tab="original" class="${etPracticeTab==='original'?'selected':''}">Previous exams & TBLs · original</button></div>${etPracticeTab==='original'?originalWorkspace():etPracticeTab==='mock'?etMockPanel():etPracticeTab==='sets'?etConceptPanel():''}`};
const practiceBeforeOriginals=practice;practice=function(){return etPracticeTab==='original'?intro('Original papers · your uploads','Previous exams & TBLs','Practice the supplied wording and figures, then compare the printed keys with clearly labeled review notes.')+etPracticeWorkspace():practiceBeforeOriginals()};
const renderBeforeOriginals=render;render=function(){renderBeforeOriginals();const extras=document.querySelector('#navExtras');if(extras&&['library','lectures','weakness','methods','sources'].includes(view))extras.open=true;document.querySelectorAll('nav button[data-view="practice"]').forEach(b=>b.classList.toggle('active',view==='practice'&&(b.hasAttribute('data-original-mode')?etPracticeTab==='original':etPracticeTab!=='original')))};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.strikeQ){e.preventDefault();handleChoiceElimination(b);return}if(b.hasAttribute('data-original-mode')){etPracticeTab='original';go('practice')}else if(b.dataset.view==='practice'){etPracticeTab=etPracticeEntryTab();go('practice')}if(b.dataset.originalJump!==undefined){document.querySelector('#original-question-'+Number(b.dataset.originalJump))?.scrollIntoView({block:'start',behavior:'instant'});return}if(b.dataset.retryAssessments==='REN'){loadCourseAssessments('REN');render();return}if(b.id==='retryMolAssessments'){loadMolAssessments();render();return;}if(b.dataset.originalStart){const set=ORIGINAL_EXAMS.sets.find(s=>s.id===b.dataset.originalStart);if(set&&(!globalThis.reviewArchivedStudyItem?.(set)||globalThis.reviewCourseScope==='CVP')){originalBrowseOnly=false;originalRun=originalRuns[set.id]||{setId:set.id,ids:set.ids,answers:{},startedAt:new Date().toISOString(),finishedAt:null};saveOriginalRun();render()}}if(b.id==='originalClose'){originalBrowseOnly=true;render()}if(b.hasAttribute('data-reload-original')){location.reload();return}if(b.id==='originalSubmit'&&originalRun){if(originalGrade(originalRun).total!==originalRun.ids.length){toast('Load all original questions before submitting.');return}originalRun.finishedAt=new Date().toISOString();saveOriginalRun();render();toast(instructorSet(ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId))?'Practice answers revealed':'Original answers revealed · printed-key score is separate from readiness')}if(b.id==='originalRetry'&&originalRun){originalRun={...originalRun,ids:originalRun.setId==='ren-19-anzhelika-practice'?ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId).ids:originalRun.ids,answers:{},answerVersions:{},receipt:null,finishedAt:null,startedAt:new Date().toISOString(),questionSnapshots:null,xp:{},excludedLowScore:false};saveOriginalRun();render()}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.originalAnswer&&originalRun&&!originalRun.finishedAt){originalTrackAnswer(originalRun,t.dataset.originalAnswer,+t.value);saveOriginalRun();const count=document.querySelector('#originalAnswered');if(count)count.textContent=originalAnswerCount(originalRun)+' / '+originalRun.ids.length+' responses saved on this device.'}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.originalWritten&&originalRun&&!originalRun.finishedAt){originalTrackAnswer(originalRun,t.dataset.originalWritten,t.value.slice(0,5000));saveOriginalRun()}});
render();

document.querySelector('.profile-brand .brand')?.addEventListener('click',()=>{const extras=document.querySelector('#navExtras');if(extras)extras.open=false});
