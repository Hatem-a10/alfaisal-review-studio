'use strict';
let guideTopic=0,guideTopicLesson=null,objectiveCardIndex=0;
let deepMode='guide',conceptBatch=null,recallAnswers={},recallFeedback={};
const guideFor=id=>typeof TEACHING!=='undefined'?(TEACHING.guides?.[id]||TEACHING[id]):null;
function resetDeepLearning(){guideTopic=0;objectiveCardIndex=0;guideTopicLesson=null;deepMode='guide';conceptBatch=null;recallAnswers={};recallFeedback={}}
const staticGuideParagraphs=new WeakMap();
// A5-143: memoize identical text-only teaching paragraphs by the original array;
// compare the serialized strings so edits cannot return stale lesson content.
function guideParagraphs(value){
 const rows=Array.isArray(value)?value:value?[value]:[];
 if(Array.isArray(value)&&rows.every(v=>typeof v==='string')){
  const signature=JSON.stringify(rows),prior=staticGuideParagraphs.get(value);
  if(prior?.signature===signature)return prior.html;
  const html=rows.map(v=>`<p>${esc(v)}</p>`).join('');
  staticGuideParagraphs.set(value,{signature,html});return html;
 }
 return rows.map(v=>`<p>${esc(typeof v==='string'?v:JSON.stringify(v))}</p>`).join('');
}
function guideList(values,cls=''){return values?.length?`<ul class="${cls}">${values.map(v=>`<li>${esc(typeof v==='string'?v:v.term?`${v.term}: ${v.definition}`:JSON.stringify(v))}</li>`).join('')}</ul>`:''}
function guideFigure(ref,caption){const images=ref?.image?[ref]:typeof DIAGRAMS==='undefined'?[]:DIAGRAMS[ref?.source+':'+ref?.page]||[];return images.map(p=>`<figure class="lesson-figure extracted-figure"><a href="${esc(p.image)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" ${p.width&&p.height?`width="${p.width}" height="${p.height}"`: ''} src="${esc(p.image)}" alt="${esc(p.caption||caption||'Lecture diagram')} · extracted source figure"></a><figcaption>${esc(p.caption||caption||'Lecture diagram')} · source ${sourceById(ref.source)?.unit==='slide'?'slide':'page'} ${ref.page} · <button type="button" class="image-caption-open" data-image-src="${esc(p.image)}">Enlarge diagram</button></figcaption></figure>`).join('')}
function objectiveCards(sections){
 return sections.flatMap((section,topic)=> (section.concepts||[]).map(concept=>({concept,section,topic})));
}
function objectiveCardMarkup(cards,index){
 const {section,concept}=cards[index];
 const cue=section.recordedExamCue?.conceptTitle===concept.title?section.recordedExamCue:null;
 return `<section class="panel"><label>Jump to concept card<select id="objectiveCard">${cards.map(({concept},i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(concept.title)}</option>`).join('')}</select></label></section>
 <article class="panel teaching-card"><span class="eyebrow muted">CONCEPT CARD ${index+1} OF ${cards.length}</span>
 <h2>${esc(concept.title)}</h2>
 ${objectiveConcepts({recordedExamCue:cue})}
 <p>${esc(concept.text)}</p>${concept.figure?guideFigure(concept.figure,concept.title):''}${conceptSourceDisclosure(concept.references)}
 <div class="lesson-actions"><button data-objective-card-step="-1" ${index===0?'disabled':''}>← Previous card</button><button data-objective-card-step="1" ${index===cards.length-1?'disabled':''}>Next card →</button></div></article>`;
}
function selectObjectiveCard(guide,index){
 const cards=objectiveCards(guide?.sections||[]);
 if(!cards.length)return;
 objectiveCardIndex=Math.min(cards.length-1,Math.max(0,index));
 cardIndex=guideTopic=cards[objectiveCardIndex].topic;
}
function objectiveConcepts(section){
 const cue=section.recordedExamCue,scope=section.scopeNote;
 const evidence=note=>'<a href="'+esc(note.url)+'" target="_blank" rel="noopener noreferrer">Recording · '+esc(note.time)+'</a>';
 return (cue?'<aside class="exam-focus"><strong>★ Explicit lecturer question · '+esc(cue.label)+'</strong><p>'+esc(cue.text)+'</p>'+evidence(cue)+'</aside>':'')
  +(scope?'<aside class="notice"><strong>'+esc(scope.label)+'</strong><p>'+esc(scope.text)+'</p>'+evidence(scope)+'</aside>':'')
  +(section.concepts?.map(concept=>'<p class="renal-concept">'+esc(concept.text)+'</p>'+
   (concept.figure?guideFigure(concept.figure,concept.title):'')).join('')||'');
}
function sectionCard(x,section,i){const id=section.id||x.id+'-section-'+i,key='section:'+id,read=(rec(x).learning?.read||[]).includes(key),refs=section.references||[],figure=section.figure||refs.find(r=>typeof DIAGRAMS!=='undefined'&&DIAGRAMS[r.source+':'+r.page]);return `<article class="guide-section" id="guide-${i}"><div class="section-head"><span class="eyebrow">${String(i+1).padStart(2,'0')}</span><button data-guide-read="${esc(key)}" class="${read?'section-read':''}">${read?'✓ Studied':'Mark section studied'}</button></div><h2>${esc(section.title)}</h2>${guideParagraphs(section.body||section.paragraphs)}${section.concepts?.length||section.recordedExamCue||section.scopeNote?objectiveConcepts(section):''}${section.keyPoints?.length?`<div class="guide-key"><h3>What to remember</h3>${guideList(section.keyPoints)}</div>`:''}${section.comparison?.length?`<div class="guide-key"><h3>Compare the cases</h3>${guideList(section.comparison)}</div>`:''}${section.example?`<div class="worked-example"><h3>Worked example</h3>${guideParagraphs(typeof section.example==='object'?(section.example.text||section.example.solution||JSON.stringify(section.example)):section.example)}</div>`:''}${figure?guideFigure(figure,section.title):''}${section.pitfalls?.length?`<div class="guide-pitfalls"><h3>Common exam traps</h3>${guideList(section.pitfalls)}</div>`:''}${conceptSourceDisclosure(refs,section.furtherReading)}</article>`}
function guideAtlas(l){const refs=(l.references||[]).filter(r=>sourceById(r.source)?.unit==='slide'),ids=[...new Set(refs.map(r=>r.source))];return ids.length?`<details class="slide-atlas"><summary>Original presentation sources</summary><p class="muted">The lesson shows extracted diagrams. Open the source presentation when you want the full slides.</p><div class="card-sources">${ids.map(source=>sourceLink({source,page:1})).join('')}</div></details>`:''}
const compactConceptReader=lessonReader;
function topicControls(sections){return `<div class="topic-controls"><label for="guideTopic">Topic ${guideTopic+1} of ${sections.length}<select id="guideTopic">${sections.map((v,i)=>`<option value="${i}" ${i===guideTopic?'selected':''}>${i+1}. ${esc(v.title)}</option>`).join('')}</select></label><div class="topic-navigation"><button data-topic-prev ${guideTopic===0?'disabled':''}>← Previous topic</button><button data-topic-next ${guideTopic===sections.length-1?'disabled':''}>Next topic →</button></div></div>`}
lessonReader=function(x,l,s){const guide=guideFor(x.id);if(!guide||customLesson)return compactConceptReader(x,l,s);if(guideTopicLesson!==x.id){guideTopic=0;objectiveCardIndex=0;guideTopicLesson=x.id}// A5-021: the previous n/read scan was unused by this reader's output.
 const sections=guide.sections||[],cards=objectiveCards(sections);guideTopic=Math.max(0,Math.min(guideTopic,sections.length-1));return `<section class="panel guide-toolbar"><div class="segmented"><button data-deep-mode="guide" class="${deepMode==='guide'?'selected':''}">Topics</button><button data-deep-mode="cards" class="${deepMode==='cards'?'selected':''}">Concept cards · ${cards.length||sections.length}</button></div><button type="button" data-print-lesson aria-label="Print study sheet">Print</button></section>`+(deepMode==='cards'?(cards.length?objectiveCardMarkup(cards,objectiveCardIndex):`<section class="panel"><label>Jump to concept card<select id="deepConcept">${sections.map((f,i)=>`<option value="${i}" ${i===cardIndex?'selected':''}>${i+1}. ${esc(f.title)}</option>`).join('')}</select></label></section>`+topicConceptCard(x,l,sections,Math.max(0,Math.min(cardIndex,sections.length-1)))):`<section class="panel complete-guide"><details class="topic-overview"><summary>Lecture overview & learning objectives</summary>${guideParagraphs(guide.overview)}${guideList(guide.objectives)}${guide.sourceNotes?.length?`<div class="notice">${guideList(guide.sourceNotes)}</div>`:''}</details>${topicControls(sections)}${sectionCard(x,sections[guideTopic],guideTopic)}<div class="topic-footer"><button class="primary" data-topic-complete>${guideTopic===sections.length-1?'Mark topic studied':'Mark studied & next topic →'}</button>${topicControls(sections).replace('for="guideTopic"','for="guideTopicBottom"').replace('id="guideTopic"','id="guideTopicBottom"')}</div>${guideTopic===sections.length-1?`<details class="guide-summary"><summary>Lecture recap & practice</summary>${guideList(guide.summary)}<div class="lesson-actions"><button data-learn-tab="quiz">Practice & recall</button></div></details>`:''}${guideAtlas(l)}<p class="section-sub">A topic is complete when its checked MCQ accuracy reaches at least 85%. Review passes remain independent.</p></section>`)};
function practiceTopics(l){const topics=inlineTopicsFor(l),groups=inlineGroups(l).groups;return topics.map((t,i)=>({...t,questions:[...new Map((groups[i]||[]).filter(q=>!q.duplicateOf&&ExamEngine.usable(q)).map(q=>[q.id,q])).values()]}))}
function makeConceptBatch(x,l,concept){const topics=practiceTopics(l),candidate=concept||topics.find(t=>t.id!==conceptBatch?.concept&&t.questions.length&&!inlineTopicScore(l,t.questions).complete)?.id||topics.find(t=>t.questions.length)?.id;const qs=candidate==='__all'?[...new Map(topics.flatMap(t=>t.questions).map(q=>[q.id,q])).values()]:topics.find(t=>t.id===candidate)?.questions||[];return {lecture:x.id,concept:candidate,questions:qs,orders:qs.map(q=>(q.preserveOptionOrder?q.options.map((_,i)=>i):ExamEngine.shuffle(q.options.map((_,i)=>i)))),answers:{},submitted:false}}

function questionProvenance(q){return `${q.adaptationNote?`<details class="repair-note"><summary>Question repaired for practice</summary><p>${esc(q.adaptationNote)}</p>${q.originalQuestion?`<p><b>Original wording</b><br>${esc(q.originalQuestion)}</p>${q.originalOptions?.length?`<ol type="A">${q.originalOptions.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}`:''}</details>`:''}<div class="card-sources">${(q.references||[]).map(sourceLink).join('')}</div>`}
function conceptQuestionMarkup(q,i,batch){const choice=batch.answers[i],order=batch.orders[i];return `<article class="concept-question" data-question-id="${esc(q.id)}" data-question-context="${batch.submitted?'review':'practice'}" id="concept-question-${i}"><div class="section-head"><span class="pill">${i+1} / ${batch.questions.length}</span></div><h3>${esc(q.question)}</h3>${q.image?`<img class="question-image" src="${esc(q.image)}" alt="${esc(q.imageAlt||'Question figure')}">`:''}<div class="answer-options">${order.map((idx,j)=>`<label class="answer-option ${batch.submitted?(idx===q.answer?'correct':idx===choice?'incorrect':''):''}"><input type="radio" name="batchAnswer-${i}" data-batch-question="${i}" value="${idx}" ${choice===idx?'checked':''} ${batch.submitted?'disabled':''}><span class="option-letter">${String.fromCharCode(65+j)}</span><span>${esc(q.options[idx])}</span></label>`).join('')}</div>${q.kind?`<p class="question-kind question-kind-foot">${esc(q.kind)}</p>`:''}${batch.submitted?`<div class="answer-feedback ${choice===q.answer?'success':'retry'}"><strong>${choice===q.answer?'✓ Correct':choice===undefined?'Unanswered':'Review this answer'}</strong><p>${esc(q.explanation)}</p>${q.explanationFigure?guideFigure(q.explanationFigure,"Explanation diagram"):""}${q.reasons?.some(Boolean)?'<h4>Every choice explained</h4>':'<p class="muted">The booklet supplies a key without a choice-by-choice rationale.</p>'}${order.map((idx,j)=>`<p><b>${String.fromCharCode(65+j)}. ${idx===q.answer?'Correct. ':''}</b>${esc(q.reasons?.[idx]||'')}</p>`).join('')}</div>`:''}${batch.submitted?questionProvenance(q):''}</article>`}
let practiceView=null,practiceLoading=null;
adaptiveQuiz=function(x,l,s){if(practiceView)return practiceView(x,l,s);practiceLoading??=import('/learning-practice.mjs').then(m=>{practiceView=m.markup;if(view==='learning')render()}).catch(()=>{practiceLoading=null});return '<section class="panel"><p role="status">Opening practice & recall…</p></section>'};

function normalizeRecall(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/α/g,'alpha').replace(/β/g,'beta').replace(/γ/g,'gamma').replace(/δ/g,'delta').replace(/−/g,'-').replace(/[’′]/g,"'").replace(/[^\p{L}\p{N}+\-]/gu,'')}
function recallLab(x,l,s){return adaptiveQuiz(x,l,s)}

function saveLearningMark(key){const x=DATA.items.find(v=>v.id===lessonId),r=rec(x).learning||{},read=new Set([...(r.read||[]),key]),g=guideFor(x.id);if(key.startsWith('section:')&&g?.sections?.every((s,i)=>read.has('section:'+(s.id||x.id+'-section-'+i))))for(const f of lessonById(x.id).facts)read.add(f.id);state[x.id]={...rec(x),learning:{...r,read:[...read]}};persist()}
document.addEventListener('change',e=>{const t=e.target;if(t.id==='guideTopic'||t.id==='guideTopicBottom'){guideTopic=Number(t.value)||0;render()}if(t.id==='objectiveCard'){selectObjectiveCard(guideFor(lessonId),Number(t.value));render()}if(t.id==='deepConcept'){cardIndex=+t.value;render()}if(t.id==='batchConcept'){const x=DATA.items.find(x=>x.id===lessonId);conceptBatch=makeConceptBatch(x,lessonById(lessonId),t.value);render()}if(t.dataset.batchQuestion!==undefined&&conceptBatch&&!conceptBatch.submitted){conceptBatch.answers[+t.dataset.batchQuestion]=+t.value;if($('#batchAnswered'))$('#batchAnswered').textContent=Object.keys(conceptBatch.answers).length+' / '+conceptBatch.questions.length+' answered'}if(t.dataset.matchGroup!==undefined){const q=guideFor(lessonId).matching[+t.dataset.matchGroup],id=q.id||lessonId+'-match-'+t.dataset.matchGroup;recallAnswers[id+':'+t.dataset.matchIndex]=t.value}});
document.addEventListener('input',e=>{if(e.target.dataset.recallAnswer)recallAnswers[e.target.dataset.recallAnswer]=e.target.value});
// Replace only the graded question set and its status. Keep lesson navigation,
// study tab selection, search state, scroll position and unrelated controls mounted.
function replaceConceptFeedback(markup,root=document){
 const old=root.querySelector('.concept-batch'),oldHeader=root.querySelector('.concept-batch-header');
 if(!old||!oldHeader)return false;
 const fragment=root.createElement('template');fragment.innerHTML=markup;
 const next=fragment.content.querySelector('.concept-batch'),nextHeader=fragment.content.querySelector('.concept-batch-header');
 if(!next||!nextHeader)return false;
 oldHeader.replaceWith(nextHeader);old.replaceWith(next);return true;
}
document.addEventListener('click',e=>{const link=e.target.closest('[data-guide-jump]');if(link){e.preventDefault();guideTopic=Number(link.dataset.guideJump)||0;render();return}const b=e.target.closest('button');if(!b)return;const x=DATA.items.find(x=>x.id===lessonId),l=lessonById(lessonId);if(b.hasAttribute('data-topic-prev')){guideTopic=Math.max(0,guideTopic-1);render()}if(b.hasAttribute('data-topic-next')){guideTopic=Math.min(guideFor(x.id).sections.length-1,guideTopic+1);render()}if(b.hasAttribute('data-topic-complete')){const sections=guideFor(x.id).sections;saveLearningMark('section:'+(sections[guideTopic].id||x.id+'-section-'+guideTopic));if(guideTopic<sections.length-1)guideTopic++;render();toast('Topic studied')}if(b.dataset.objectiveCardStep){selectObjectiveCard(guideFor(lessonId),objectiveCardIndex+Number(b.dataset.objectiveCardStep));render();return}if(b.dataset.deepMode){if(b.dataset.deepMode==='cards'&&deepMode!=='cards'){cardIndex=guideTopic;const guide=guideFor(lessonId);selectObjectiveCard(guide,objectiveCards(guide?.sections||[]).findIndex(card=>card.topic===guideTopic));}else if(b.dataset.deepMode==='guide'&&deepMode==='cards')guideTopic=cardIndex;deepMode=b.dataset.deepMode;render()}if(b.dataset.guideRead){saveLearningMark(b.dataset.guideRead);render();toast('Lesson section marked studied')}if(b.id==='submitConceptBatch'&&conceptBatch&&!conceptBatch.submitted){if(conceptBatch.questions.some((q,i)=>!Number.isInteger(conceptBatch.answers[i]))){toast('Answer every question in the concept before checking the set.');return}const answers=conceptBatch.questions.map((q,i)=>conceptBatch.answers[i]??-1);if(typeof ExamTools==='undefined'){toast('Question tools are loading. Try again.');return}ExamTools.recordSet(conceptBatch.questions,answers,'Lesson topic questions',{lessonId:x.id});conceptBatch.submitted=true;const patched=typeof practiceView==='function'&&replaceConceptFeedback(practiceView(x,l,Learn.status(rec(x))));if(!patched)render();toast('Concept set checked · explanations are below')}if(b.hasAttribute('data-next-batch')){conceptBatch=makeConceptBatch(x,l);render()}if(b.hasAttribute('data-retry-batch')){conceptBatch=makeConceptBatch(x,l,conceptBatch.concept);render()}if(b.dataset.checkBlank!==undefined){const i=+b.dataset.checkBlank,q=guideFor(x.id).fillBlanks[i],id=q.id||x.id+'-blank-'+i,answer=normalizeRecall(recallAnswers[id]),correct=answer.length>0&&(q.answers||[q.answer]).some(v=>normalizeRecall(v)===answer);recallFeedback[id]={correct};if(correct)saveLearningMark('activity:'+id);render()}if(b.dataset.checkMatch!==undefined){const i=+b.dataset.checkMatch,q=guideFor(x.id).matching[i],id=q.id||x.id+'-match-'+i,results=q.pairs.map((p,j)=>recallAnswers[id+':'+j]===String(j));recallFeedback[id]={results};if(results.every(Boolean))saveLearningMark('activity:'+id);render()}});
render();
const baseSourceQuestionPanel=sourceQuestionsPanel;
sourceQuestionsPanel=function(){return baseSourceQuestionPanel().replace(/<p class="muted">(\d+) results\. This is a source-reading index, not a graded quiz\. Figures and uncertain keys must be checked against the PDF\.<\/p>/,(_,n)=>`<p class="muted">${n} source questions. Reviewed and repaired versions can be practiced in their lesson’s concept sets. Original wording and printed keys remain available for comparison.</p>`).replace(/<article class="source-question">([\s\S]*?)<\/article>/g,(html)=>{const q=LEARNING.sourceQuestions.find(q=>html.includes('<h3>'+esc(q.question)+'</h3>')),graded=q&&(q.reviewedQuestionId?LEARNING.questions.find(v=>v.id===q.reviewedQuestionId):LEARNING.questions.find(v=>v.id===q.id));if(q?.adaptedSource)html=html.replace('Printed key:','Practice version key:');return graded?html.replace('</article>',`<button class="primary" data-practice-question="${esc(graded.id)}">Practice explained version</button></article>`):html})};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.practiceQuestion){const q=LEARNING.questions.find(q=>q.id===b.dataset.practiceQuestion);if(!q)return;chooseLesson(q.lectureIds[0],'quiz');conceptBatch=makeConceptBatch(DATA.items.find(x=>x.id===lessonId),lessonById(lessonId),q.concept);render();const i=conceptBatch.questions.findIndex(v=>v.id===q.id);$('#concept-question-'+i)?.scrollIntoView({behavior:'smooth',block:'start'})}});
const expandedDocumentPanel=documentPanel;
documentPanel=function(){const html=expandedDocumentPanel();if(documentId)return html;const c=LEARNING.meta?.sourceCoverage;return html+(c?.newExamItems?`<details class="coverage-panel"><summary>Question-bank coverage & repairs</summary><p>All ${c.newExamItems} recalled items in the three new exam PDFs are linked to an explained practice version: ${c.direct} direct adaptations and ${c.equivalent} repeated/equivalent tasks. The booklet bank is curated; the full source index remains searchable, including material awaiting a separate explanation.</p><a href="/api/site-assets/materials/question-bank-coverage.json" target="_blank" rel="noopener noreferrer">Read source coverage and correction audit ↗</a></details>`:'')};

// A study sheet is a read-only rendering of the whole guide, not the current
// quiz, student notes, review state, or account page.
function lessonPrintMarkup(item,guide){
 const block=(title,body)=>body?`<section><h2>${title}</h2>${body}</section>`:'';
 const list=(title,items)=>block(title,guideList(items));
 const sections=(guide.sections||[]).map((section,index)=>{
  const example=typeof section.example==='object'&&section.example?section.example.text||section.example.solution||JSON.stringify(section.example):section.example;
  const refs=(section.references||[]).map(ref=>{
   const source=sourceById(ref.source);
   return source?.name?`${source.name} · ${source.unit==='slide'?'slide':'page'} ${ref.page}${ref.endPage?'–'+ref.endPage:''}`:'';
  }).filter(Boolean);
  return `<article class="print-topic"><h2>${index+1}. ${esc(section.title)}</h2>${guideParagraphs(section.body||section.paragraphs)}${objectiveConcepts(section)}${list('What to remember',section.keyPoints)}${list('Compare the cases',section.comparison)}${example?block('Worked example',guideParagraphs(example)):''}${list('Common exam traps',section.pitfalls)}${list('Sources',refs)}</article>`;
 }).join('');
 return `<header><p>Review Studio · ${esc(item.id)}</p><h1>${esc(item.title)}</h1></header>${block('Overview',guideParagraphs(guide.overview))}${list('Learning objectives',guide.objectives)}${list('Source notes',guide.sourceNotes)}${sections}${list('Lecture recap',guide.summary)}`;
}
document.addEventListener('click',event=>{
 if(!event.target.closest?.('[data-print-lesson]'))return;
 const item=DATA.items.find(x=>x.id===lessonId),guide=item&&guideFor(item.id);
 if(!guide||!Array.isArray(guide.sections)||!guide.sections.length)return;
 document.getElementById('lessonPrintSheet')?.remove();
 const sheet=document.createElement('article');
 sheet.id='lessonPrintSheet';
 sheet.innerHTML=lessonPrintMarkup(item,guide);
 document.body.append(sheet);
 document.body.classList.add('printing-lesson-sheet');
 const cleanup=()=>{sheet.remove();document.body.classList.remove('printing-lesson-sheet');window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup,{once:true});
 try{window.print();}catch{cleanup();toast('Printing is unavailable. Try your browser print controls.');}
});

// Calculation drills are loaded only for verified relevant physiology lessons.
let lessonFormulaModule=null,lessonFormulaLoading=null;
const lessonReaderBeforeFormulaDrills=lessonReader;
lessonReader=function(x,l,s){
 const markup=lessonReaderBeforeFormulaDrills(x,l,s),eligible=/^CVP-P\d+$/.test(x.id)||['REN-P2','REN-P3','REN-P4'].includes(x.id);
 if(!eligible)return markup;
 if(lessonFormulaModule){
  const topic=typeof guideFor==='function'?guideFor(x.id)?.sections?.[deepMode==='cards'?cardIndex:guideTopic]?.id:null;
  return markup+lessonFormulaModule.lessonFormulaMarkup(x.id,topic);
 }
 lessonFormulaLoading??=import('/lesson-formula-drills.mjs').then(module=>{lessonFormulaModule=module;module.installLessonFormulaDrills();if(view==='learning')render()}).catch(()=>{lessonFormulaLoading=null});
 return markup;
};
