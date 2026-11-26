import {escapeHTML as escapeHTML} from './html-escape.mjs';
import {bookletAnnotation,mergeBookletAnnotations} from './phase2-practice-core.mjs';
import {bookletMockQuestions} from './reviewed-mock-pool.mjs';
import {activeBookletPaths,bookletLoader,validateActiveBooklet} from './active-booklet-core.mjs';
import {reviewedOverlayPaths,applyReviewedOverlay,fetchReviewedOverlay} from './booklet-reviewed-overlay.mjs';
import {bookletSections} from './renal-study.mjs';
import {withQuestionContext,load as loadCvpBooklet} from './cvp19-booklet.mjs';
import {formulaPage,installFormulas,resetFormulaView} from './formulas-practice.mjs?v=2';
import {bookletEntry,resolveBookletNavigation,deduplicateQuestions,analytics,rankWeakQuestions,updateSnapshot,coverageAudit,selectBooklet,advanceBooklet,previousBooklet,enforceHistoryLimit,randomizeBooklet} from './phase2-practice-core.mjs';
export {deduplicateQuestions,analytics,rankWeakQuestions,updateSnapshot,coverageAudit,selectBooklet,advanceBooklet,previousBooklet,enforceHistoryLimit,randomizeBooklet} from './phase2-practice-core.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
export function bookletAnswerDetails(q,state){if(!state.completed||q.type!=='mcq'||!Array.isArray(q.options))return '';const accepted=(q.acceptedAnswers||[q.answer]).filter(i=>Number.isInteger(i)&&i>=0&&i<q.options.length);if(!accepted.length)return '';const answers=accepted.map(i=>`${String.fromCharCode(65+i)}. ${escapeHTML(q.options[i])}`).join(' / '),label=q.answer===null?'Accepted source alternatives (self-check):':'Correct answer:';const reasons=Array.isArray(q.reasons)&&q.reasons.some(Boolean)?`<details class="booklet-option-reasons"><summary>Why each option fits or fails</summary>${q.options.map((o,i)=>`<p><b>${String.fromCharCode(65+i)}. ${escapeHTML(o)}</b><br>${escapeHTML(q.reasons[i]||'')}</p>`).join('')}</details>`:'';return `<p><strong>${label} ${answers}</strong></p>${reasons}`}
export function bookletCheckResult(q,answer,at=new Date().toISOString()){if(!Array.isArray(q?.options)||!Number.isInteger(answer)||answer<0||answer>=q.options.length)throw Error('Invalid booklet selection');const choice=q.choiceRevision?{answer,choiceRevision:q.choiceRevision}:{answer};return q.answer===null?{...choice,revealed:true,at}:{...choice,correct:(q.acceptedAnswers||[q.answer]).includes(answer),completed:true,at}}
const bookletCourse=()=>globalThis.reviewBookletCourse?.()||'CVP';
const isRenalBooklet=()=>bookletCourse()==='REN';
const activeBookletMeta={MOL:{version:3,pages:261,mcqs:874},REN:{version:3,pages:294,mcqs:645}};
// Reviewed answers are layered over the validated pack; the source pack itself is never changed.
export function reviewedBookletLoader(course,{loadPack=bookletLoader(activeBookletPaths[course],activeBookletMeta[course]),loadOverlay=()=>fetchReviewedOverlay(reviewedOverlayPaths[course])}={}){
 return async()=>{
  const [pack,overlay]=await Promise.all([loadPack(),loadOverlay()]);
  if(!overlay)return pack;
  const reviewed=applyReviewedOverlay(pack,overlay,course).pack;
  return validateActiveBooklet(reviewed,activeBookletMeta[course]);
 };
}
const activeBookletLoaders={MOL:reviewedBookletLoader('MOL'),REN:reviewedBookletLoader('REN')};
const activeBooklets={},bookletRequests={},bookletErrors={},mockBanks={};
function loadActiveBooklet(course){
 if(activeBooklets[course])return Promise.resolve(activeBooklets[course]);
 if(bookletRequests[course])return bookletRequests[course];
 bookletErrors[course]=false;
 return bookletRequests[course]=activeBookletLoaders[course]().then(value=>{
  activeBooklets[course]=value;window.reviewAutoRetry?.ok('booklet-'+course);
  return value;
 }).catch(error=>{
  bookletErrors[course]=true;
  console.error(error);
  window.reviewAutoRetry?.schedule('booklet-'+course,()=>{
   if(view==='booklet'&&bookletCourse()===course||view==='practice'&&etPracticeTab==='mock'&&etMockScope===course)loadActiveBooklet(course);
  });
  return null;
 }).finally(()=>{
  delete bookletRequests[course];
  if(view==='booklet'&&bookletCourse()===course||view==='practice'&&etPracticeTab==='mock'&&etMockScope===course)render();
 });
}
function reviewedMockQuestions(course){
 const pack=activeBooklets[course];
 return pack?(mockBanks[course]??=bookletMockQuestions(pack,course,DATA.items,withQuestionContext)):[];
}
const renalPracticeQuestions=()=>{
 if(!activeBooklets.REN&&!bookletErrors.REN)loadActiveBooklet('REN');
 return reviewedMockQuestions('REN');
};
const bookletStatus=course=>bookletErrors[course]?'error':activeBooklets[course]?'ready':'loading';
const bookletPack=()=>activeBooklets[bookletCourse()]||(bookletCourse()==='CVP'?pack:null);
const startNav={filter:'unanswered',position:0};
const navigationKey=()=>({REN:'renalNavigation',MOL:'molNavigation'})[bookletCourse()];
function readBooklet(){
 const d=read(),key=navigationKey();
 if(!key)return d;
 const state={...startNav,...d[key],booklet:d.booklet||{},bookletAnnotations:d.bookletAnnotations||{}};
 const questions=bookletPack()?.questions;
 return questions?resolveBookletNavigation(questions,state):state;
}
function writeBooklet(d){
 const key=navigationKey();
 if(!key)return write(d);
 const {booklet,bookletAnnotations,...nav}=d;
 return write({...read(),booklet,bookletAnnotations,[key]:{...nav,at:new Date().toISOString()}},false);
}

let pack=null,loading=null,selected='main',admin=null,installed=false,capabilityRequest=null;
function read(){return storeOptions().phase2Practice||{booklet:{},mocks:[],filter:'unanswered',position:0}}
function write(d,navigate=true){if(navigate)d.navigationAt=new Date().toISOString();const o=storeOptions();o.phase2Practice=d;if(JSON.stringify(o).length>6900000){toast('Account storage limit reached; remove a saved mock before adding more.');return false}try{saveOptions(o);return true}catch(e){toast('Could not save practice progress: '+e.message);return false}}
function load(){if(!loading)loading=loadCvpBooklet().then(p=>{pack=p;render()}).catch(e=>{loading=null;toast(e.message)});return loading}
function current(d){const pack=bookletPack(),x=selectBooklet(pack.questions,d);return {a:x.list,q:x.question?withQuestionContext(x.question,pack):null,position:x.question?Math.max(0,x.list.findIndex(q=>q.id===x.question.id)):x.position}}
let displayedBookletQuestion=null;
function bookMarkup(){
 displayedBookletQuestion=null;const renal=isRenalBooklet(),mol=bookletCourse()==='MOL',pack=bookletPack();
const heading=renal?'REN 123 · Booklet':mol?'MOL 114 · 18th Batch Booklet':'Corrected 19th booklet';
const original=mol?'/api/site-assets/materials/mol114/18th-booklet.pdf':'/api/site-assets/materials/ren123/past-paper-booklet.pdf';
const source=renal?'<details class="renal-source-index"><summary>Source booklet</summary><p><a href="'+original+'" target="_blank" rel="noopener">Open full PDF ↗</a></p>'+
 bookletSections.map(([section,entries])=>'<details><summary>'+section+'</summary><ul>'+entries.map(([label,page])=>'<li><a href="'+original+'#page='+page+'" target="_blank" rel="noopener">'+escapeHTML(label)+'</a></li>').join('')+'</ul></details>').join('')+'</details>':mol?'<details class="renal-source-index"><summary>Source booklet</summary><p><a href="'+original+'" target="_blank" rel="noopener">Full PDF ↗</a></p><ul>'+
 (pack?.chapters||[]).map(chapter=>'<li><a href="'+original+'#page='+Number(chapter.page)+'" target="_blank" rel="noopener">MOL '+Number(chapter.number)+' · '+escapeHTML(chapter.title)+'</a></li>').join('')+
 '<li><a href="'+original+'#page=234" target="_blank" rel="noopener">Written cases ↗</a></li><li><a href="'+original+'#page=260" target="_blank" rel="noopener">Lab ↗</a></li></ul></details>':'';
if(!pack){
 // Failed loads retry on their own (reviewAutoRetry); the panel only ever says it is loading.
 if(renal||mol){if(!bookletErrors[bookletCourse()]&&!window.reviewAutoRetry?.pending('booklet-'+bookletCourse()))loadActiveBooklet(bookletCourse())}else load();
 return '<section class="panel booklet-overview"><h1>'+heading+'</h1><p role="status">Loading booklet…</p>'+source+'</section>';
}
const d=readBooklet(),{a,q,position}=current(d),completed=pack.questions.filter(q=>{const x=bookletEntry(q,d.booklet);return x?.completed&&x.correct!==false}).length;
const inventory=pack.counts?'<p>'+pack.counts.mcq+' unique MCQs'+(pack.counts.saq?' · '+pack.counts.saq+' written questions':'')+(pack.counts.ospe?' · '+pack.counts.ospe+' OSPE questions':'')+'</p>':'';
const overview=`<section class="panel booklet-overview"><div class="booklet-overview-heading"><div><h1>${heading}</h1>${inventory}</div>${source}</div>
 <div class="booklet-progress"><progress value="${completed}" max="${pack.questions.length}" aria-label="Booklet completion"></progress><span>${completed} of ${pack.questions.length} completed</span></div>
 ${filters(d)}</section>`;
if(!q)return overview+'<section class="panel booklet-empty">No questions match these filters.</section>';
displayedBookletQuestion=q;
const stored=bookletEntry(q,d.booklet)||{},retry=stored.correct===false&&d.bookletFeedbackId!==q.id,v=retry?{...stored,completed:false,revealed:false}:stored,index=pack.questions.findIndex(x=>x.id===q.id);
const annotation=bookletAnnotation(q,d.bookletAnnotations);
window.reviewNoteBookletPosition?.(bookletCourse(),q,index);return overview+`<section class="panel booklet-question" data-question-id="${escapeHTML(q.id)}"${window.reviewReportAttrs?.(q,{course:bookletCourse(),paper:heading})||''} data-question-context="${v.completed||v.revealed?'review':'practice'}"><div class="booklet-question-meta" data-report-placement><p>${v.completed||v.revealed?'Answer review':'Showing '+(position+1)+' / '+a.length} · ${escapeHTML(q.group||q.type)} · ${renal||mol?`<a href="${original}#page=${Number(q.page)}" target="_blank" rel="noopener">Source page ${Number(q.page)} ↗</a>`:`page ${q.page}`}</p></div><div class="booklet-annotations"><button type="button" id="p2flag" aria-pressed="${annotation.flagged===true}">${annotation.flagged?'Unflag question':'Flag question'}</button><details><summary>Personal note${annotation.note?.trim()?' · saved':''}</summary><label>Private study note<textarea id="p2note" rows="3" maxlength="5000">${escapeHTML(annotation.note||'')}</textarea></label><button type="button" id="p2saveNote">Save note</button></details></div>${repeatedSourceMarkup(q,original)}${q.caseText?`<div class="original-case"><b>Case context</b><p style="white-space:pre-wrap">${escapeHTML(q.caseText)}</p></div>`:''}<h2 id="bookletStem" tabindex="-1">${escapeHTML(q.bookletDisplayStem||q.question)}</h2>${q.bookletContextNote?`<p class="muted">${escapeHTML(q.bookletContextNote)}</p>`:''}${(q.figures||[]).map(f=>`<img src="${escapeHTML(f.image)}" alt="${escapeHTML(f.alt||'Booklet question figure')}" ${f.width&&f.height?`width="${Number(f.width)}" height="${Number(f.height)}"`:""} style="max-width:100%;height:auto">`).join('')}${q.type==='mcq'&&q.options?.length?`<div class="booklet-answers" role="group" aria-label="Answer choices">${q.options.map((o,i)=>`<label class="answer-option ${v.completed?((q.acceptedAnswers||[q.answer]).includes(i)?'correct':v.answer===i?'incorrect':''):''}"><input type="radio" name="p2answer" value="${i}" ${v.answer===i?'checked':''} ${v.completed?'disabled':''}><span class="booklet-option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${escapeHTML(o)}</span></label>`).join('')}</div>`:`<label>Your answer<textarea id="p2written" rows="4">${escapeHTML(v.answer||'')}</textarea></label>`}<div class="et-exam-actions booklet-actions"><button id="p2prev" ${!d.bookletHistory?.length&&(d.position||0)<=0?'disabled':''}>Previous</button><button id="p2next" ${!v.completed&&position>=a.length-1&&!d.bookletForward?.length?'disabled':''}>Next</button><button id="p2resume">First unanswered</button>${!v.completed&&!v.revealed?`<button id="p2check" class="primary">${q.type==='mcq'&&q.answer!==null?'Check answer':'Reveal source answer'}</button>`:''}</div>${v.completed?`<div class="answer-feedback" tabindex="-1"><strong>${v.previousResult?'Previous result: '+(v.correct===true?'correct':v.correct===false?'incorrect':'self-check'):typeof v.correct==='boolean'?(v.correct?'Correct':'Review answer'):'Self-check completed'}</strong>${v.previousResult&&v.priorChoice?`<p>Previous selection: ${escapeHTML(v.priorChoice)}</p>`:''}<p style="white-space:pre-wrap">${escapeHTML((q.type==='mcq'?q.explanation:q.sourceExplanation)||q.explanation||q.printedAnswer||'No answer supplied in the source.')}</p>${bookletAnswerDetails(q,v)}${q.sourceIssue?`<p class="notice">${escapeHTML(q.sourceIssue)}</p>`:''}</div>`:''}${v.revealed&&!v.completed?`<div class="answer-feedback" tabindex="-1"><p style="white-space:pre-wrap">${escapeHTML(q.sourceExplanation||q.explanation||q.printedAnswer||'No answer supplied in the source.')}</p>${bookletAnswerDetails(q,{completed:true})}${q.sourceIssue?`<p class="notice">${escapeHTML(q.sourceIssue)}</p>`:''}<button data-p2-self="correct">I got it right</button> <button data-p2-self="incorrect">Review again</button> <button data-p2-self="ungraded">Mark complete without grading</button></div>`:''}<details class="booklet-shortcuts"><summary>Keyboard shortcuts</summary><p><kbd>↑</kbd> <kbd>↓</kbd> or <kbd>A–E</kbd> <kbd>1–5</kbd> Select an answer<br><kbd>Enter</kbd> or <kbd>→</kbd> Check or continue<br><kbd>←</kbd> Previous question</p></details></section>`}
function repeatedSourceMarkup(q,pdf){
 const locations=q.sourceLocations||[];
 if(locations.length<2)return '';
 return `<details><summary>Booklet appearances (${locations.length})</summary><ul>${locations.map(loc=>`<li><a href="${pdf}#page=${loc.page}" target="_blank" rel="noopener">${escapeHTML(loc.section)}${loc.number!=null?' · Q'+escapeHTML(loc.number):''} · p. ${loc.page}</a></li>`).join('')}</ul></details>`;
}
function filters(d){const mol=bookletCourse()==='MOL',subjects=mol?[...(activeBooklets.MOL?.chapters||[]).map(chapter=>'MOL '+chapter.number),'Written cases','Lab']:['Physiology','Anatomy','Histology','Embryology'];return `<div class="booklet-filters"><div class="booklet-modes">${[['bookletIncludeMCQ','Include MCQs',d.bookletIncludeMCQ!==false],['bookletIncludeSAQ','Include SAQs',d.bookletIncludeSAQ!==false],...(mol?[]:[['bookletIncludeOSPE','Include OSPE',d.bookletIncludeOSPE!==false]]),['bookletRandom','Random order',!!d.bookletRandom]].map(([key,label,on])=>`<label><input type="checkbox" data-booklet-mode="${key}" ${on?'checked':''}><span>${label}</span></label>`).join('')}</div><label>Show <select id="p2filter">${[['all','All questions'],['unanswered','Unanswered'],['wrong','Wrong'],['completed','Completed'],['flagged','Flagged'],['noted','With personal notes']].map(([v,l])=>`<option value="${v}" ${d.filter===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Subject <select id="bookletDiscipline">${['all',...subjects].map(v=>`<option value="${v}" ${(d.bookletDiscipline||'all')===v?'selected':''}>${v==='all'?'All subjects':v}</option>`).join('')}</select></label></div>`}
function previousMarkup(){const d=read();return `<section class="panel"><h2>Previous mocks</h2><p>Exact question and option snapshots, saved with your account. Saved attempts are retained within your account storage limit. Export a backup before explicitly deleting an attempt.</p>${(d.mocks||[]).filter(m=>!globalThis.reviewArchivedStudyItem?.(m.snapshot)||globalThis.reviewCourseScope==='CVP').map(m=>{const s=m.snapshot,answered=s.questions.filter((q,i)=>Number.isInteger(s.answers?.[i])&&s.answers[i]>=0&&s.answers[i]<q.options.length).length,correct=s.questions.reduce((n,q,i)=>n+(s.answers?.[i]===q.answer),0);return `<article><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.createdAt)} · ${s.cancelled?'Cancelled · no result recorded':s.finishedAt?(s.excludedLowScore?'Below 15% · excluded from scores':correct+' / '+answered+' correct'):'In progress'}</p><p>${(m.attempts||[s]).filter(x=>x.finishedAt&&!x.cancelled).map((x,i)=>{const n=x.questions.filter((q,i)=>Number.isInteger(x.answers?.[i])&&x.answers[i]>=0&&x.answers[i]<q.options.length).length,c=x.questions.reduce((v,q,j)=>v+(x.answers?.[j]===q.answer),0);return `Attempt ${i+1}: ${x.excludedLowScore?'below 15% · excluded':c+' / '+n}`}).join(' · ')}</p><button data-p2-retry="${escapeHTML(m.id)}">Retry same questions</button> <button data-p2-export="${escapeHTML(m.id)}">Export saved mock</button> <button data-p2-delete="${escapeHTML(m.id)}">Delete saved mock</button></article>`}).join('')||'<p>No saved mocks yet.</p>'}</section>`}
function weakMarkup(){const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack){load();return '<section class="panel">Loading analytics…</section>'}
 const d=read(),rows=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),
  archive?pack.questions:[...(activeBooklets.REN?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items.filter(x=>archive||x.course!=='CVP'));return `<section class="panel"><h2>Weak areas</h2><p>Graded MCQs, self-assessed short answers and eligible mocks.</p>${rows.slice(0,25).map(r=>`<p>${escapeHTML(r.id)} · ${r.correct}/${r.total} · ${Math.round(r.accuracy*100)}%</p>`).join('')||'<p>Complete questions to see weak areas.</p>'}<button id="p2weak" ${rows.length?'':'disabled'}>Practice weakest areas</button><details><summary>Question coverage in the current mock generator</summary><p>Lectures with no eligible question in the current generator pool:</p>${coverageAudit(DATA.items.filter(x=>archive?x.course==='CVP'||x.course==='MOL':x.course!=='CVP'),deduplicateQuestions(ExamEngine.pool(etBank(),'all','all'))).map(x=>`<p>${escapeHTML(x.id)} · ${escapeHTML(x.title)}</p>`).join('')||'<p>Every listed lecture has at least one eligible question.</p>'}<p>Mapping coverage does not guarantee that a generated mock will select every lecture.</p></details></section>`}
function weakPreview(){const d=read();const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack&&Object.keys(d.booklet||{}).length)load();
 const rows=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),
  archive?pack?.questions||[]:[...(activeBooklets.REN?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items.filter(x=>archive||x.course!=='CVP')).filter(x=>!x.id.startsWith('Discipline: ')).slice(0,3);if(!rows.length)return '';return `<section class="panel"><h2>Weakest lectures</h2>${rows.map(r=>`<p>${escapeHTML(r.id)} · ${Math.round(r.accuracy*100)}% (${r.correct}/${r.total})</p>`).join('')}<button id="p2weak" class="primary">Practice weakest lectures</button></section>`}
const practiceCards=[
 ['mock','Timed mock','Generate an exam and practice against the clock.','timer'],
 ['sets','Practice a topic','Answer a set from one lecture or topic.','book'],
 ['original','Previous exams & TBLs','Attempt previous papers in their original sets.','exam'],
 ['wrong','Wrong answers','Retry questions you missed.','practice'],
 ['previous','Previous mocks','Review or retake your saved mocks.','calendar',true],
 ['formulas','Formulas','Practice calculations and worked examples.','grades',true],
 ['weak','Weak areas','Review weak topics and build a targeted mock.','weakness',true],
];
const practiceTools=new Map(practiceCards.map(tool=>[tool[0],tool]));
function toolAvailable(id){
 if(id==='weak')return window.reviewAdmin===true;
 if(id==='formulas')return window.reviewCourseScope!=='REN'&&(!window.reviewCvpArchived?.()||window.reviewCourseScope==='CVP');
 return true;
}
const oldPracticeBar=/<div class="et-practice-tabs">[\s\S]*?<\/div>/;
const practiceBack=()=>'<button type="button" class="practice-back" data-view="practice" data-practice-home>← Practice Home</button>';
export function practiceNavigation(title,content){
 return '<div class="phase2-practice practice-tool">'+practiceBack()+'<h1>'+escapeHTML(title)+'</h1>'+content.replace(oldPracticeBar,'')+'</div>';
}
function practiceStart(){
 const savedPaper=originalRun&&!originalRun.finishedAt&&availableOriginalRun();
 const savedMock=etExam&&!etExam.cancelled&&(!window.reviewArchivedStudyItem?.(etExam)||window.reviewCourseScope==='CVP');
 return `<div class="practice-start">
  <h1>Practice Home</h1>
  ${savedMock||savedPaper?`<div class="practice-resume">
   ${savedMock?`<button type="button" class="primary" data-et-tab="mock" data-practice-resume>${etExam.finishedAt?'Review latest mock':'Resume timed mock'}</button>`:''}
   ${savedPaper?'<button type="button" class="primary" data-et-tab="original" data-practice-resume>Resume previous paper</button>':''}
  </div>`:''}
  <div class="practice-start-actions">${practiceCards.filter(([id])=>toolAvailable(id)).map(([id,title,description,icon,extra])=>`<button type="button" class="practice-tool-card" data-practice-fresh="${id}" data-${extra?'p2':'et'}-tab="${id}"><span class="practice-card-icon" aria-hidden="true">${navGlyph(icon)}</span><span><strong>${title}</strong><small>${description}</small></span><span class="practice-card-arrow" aria-hidden="true">›</span></button>`).join('')}</div>
 </div>`;
}
export function bookletScrollOffset(target,top,bottom){
 if(target.top<top)return target.top-top;
 return target.bottom>bottom?Math.min(target.bottom-bottom,target.top-top):0;
}
function revealBookletTarget(element){
 if(!element?.isConnected)return;
 const viewport=window.visualViewport;
 let top=viewport?.offsetTop??0,bottom=top+(viewport?.height??window.innerHeight);
 const header=document.querySelector('body > main > header');
 const mobileNav=document.querySelector('.mobile-dock-shell')||document.querySelector('.ui-mobile-nav');
 if(header&&['sticky','fixed'].includes(getComputedStyle(header).position))top=Math.max(top,header.getBoundingClientRect().bottom);
 if(mobileNav&&['sticky','fixed'].includes(getComputedStyle(mobileNav).position)&&mobileNav.getClientRects().length)bottom=Math.min(bottom,mobileNav.getBoundingClientRect().top);
 const delta=bookletScrollOffset(element.getBoundingClientRect(),top+14,bottom-14);
 if(delta)window.scrollBy({top:delta,behavior:'instant'});
}
function handleBookletKey(event){
 const key=event.key;
 if(view!=='booklet'||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||
    event.target.closest?.('textarea,select,[contenteditable=true],input:not([name=p2answer])')||document.querySelector('dialog[open]'))return;
 const vertical=key==='ArrowUp'||key==='ArrowDown';
 if(event.repeat&&!vertical)return;
 if(key==='ArrowDown'&&!event.repeat){
  const reasons=document.querySelector('.booklet-question .booklet-option-reasons:not([open])');
  const page=document.scrollingElement;
  if(reasons&&page&&Math.ceil(page.scrollTop+page.clientHeight)>=page.scrollHeight-2){
   event.preventDefault();
   reasons.open=true;
   const summary=reasons.querySelector('summary');
   summary?.focus({preventScroll:true});
   revealBookletTarget(summary);
   return;
  }
 }
 if(vertical||/^[a-e1-5]$/i.test(key)){
  const choices=[...document.querySelectorAll('.booklet-answers input:not(:disabled)')];
  if(!choices.length)return;
  const selected=choices.findIndex(choice=>choice.checked),direction=key==='ArrowUp'?-1:1;
  const index=vertical?(selected<0?(direction===1?0:choices.length-1):(selected+direction+choices.length)%choices.length)
   :/^[1-5]$/.test(key)?Number(key)-1:key.toUpperCase().charCodeAt(0)-65;
  const choice=choices[index];
  if(!choice)return;
  event.preventDefault();
  choice.click();
  choice.focus({preventScroll:true});
  revealBookletTarget(choice.closest('label'));
  return;
 }
 if(key==='Enter'&&event.target.closest?.('button,a,summary'))return;
 const checking=key==='Enter'||key==='ArrowRight'&&document.querySelector('input[name=p2answer]:checked');
 const action=key==='ArrowLeft'?document.getElementById('p2prev')
  :key==='Enter'||key==='ArrowRight'?(checking?document.getElementById('p2check'):null)||document.getElementById('p2next'):null;
 if(action&&!action.disabled){event.preventDefault();action.click()}
}

export function install(){if(installed)return;installed=true;window.reviewRenalPracticeQuestions=renalPracticeQuestions;window.reviewRenalPracticeLoadStatus=()=>bookletStatus('REN');window.reviewLoadMockBooklet=loadActiveBooklet;window.reviewMockBookletStatus=bookletStatus;window.reviewMockBookletQuestions=reviewedMockQuestions;installFormulas();
 window.reviewResetPracticePage=()=>{selected='main';};
 practice=function(){
  if(selected!=='main'&&!toolAvailable(selected))selected='main';
  if(etPracticeTab==='start'&&selected==='main')return practiceStart();
  const tool=selected==='main'?etPracticeTab:selected;
  const markup=tool==='formulas'?formulaPage():tool==='previous'?previousMarkup():tool==='weak'?weakPreview()+weakMarkup():etPracticeWorkspace();
  return practiceNavigation(practiceTools.get(tool)?.[1]||'Practice',((tool==='sets'||tool==='wrong')&&!etSet?resumePracticeSetButton(tool):'')+markup);
 };
 document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.matches('[data-et-tab],[data-view=practice]'))selected='main';
  if(button.hasAttribute('data-practice-resume')){
   if(button.dataset.etTab==='original')originalBrowseOnly=false;
   if(button.dataset.etTab==='mock')etMockLanding=false;
  }
  switch(button.dataset.practiceFresh){
   case 'original':resetOriginalView();break;
   case 'mock':etMockLanding=true;etMockCustomize=false;break;
   case 'sets':
   case 'wrong':resetPracticeSetView(button.dataset.practiceFresh);break;
   case 'formulas':resetFormulaView();break;
  }
 },true);
 loadCapabilities();window.addEventListener('review-admin-role',e=>{if(typeof e.detail?.admin==='boolean'){admin=e.detail.admin;if(!admin&&selected==='weak')selected='main';if(view==='practice')render()}});window.addEventListener('focus',()=>{if(admin===null)loadCapabilities()});window.Phase2Practice={booklet:()=>'<div class="phase2-booklet"><div class="booklet-toolbar">'+practiceBack()+(window.reviewCourseSelector?.('booklet')||'')+'</div>'+bookMarkup()+'</div>',startRetry(snapshot){selected='main';window.Phase2Exam.start(snapshot.questions,snapshot.questions.length,snapshot.minutes||60,{scope:'Retry · '+(snapshot.scope||'Mock'),accurate:snapshot.accurate,selectedLessons:snapshot.selectedLessons,parentMockId:snapshot.parentMockId||snapshot.id},true)},startWeighted(pool){if(window.reviewAdmin!==true)return;const course=etMockScope;pool=pool.filter(q=>q.lectureIds?.length&&q.lectureIds.every(id=>id.startsWith(course+'-')));selected='main';const count=Math.min(100,pool.length);if(!count){toast('No eligible questions found.');return}window.Phase2Exam.start(pool.slice(0,count),count,Math.max(1,count),{scope:'Weak areas'})},cancelMock(exam){try{const d=read(),parent=exam.parentMockId||exam.id;if(!(d.mocks||[]).some(m=>m.id===parent&&(m.attempts||[m.snapshot]).some(a=>a?.id===exam.id)))return true;const cancelled={...exam,answers:{},flags:{},xp:{},finishedAt:new Date().toISOString(),reason:'cancelled',excludedLowScore:true,cancelled:true,trackerRecorded:true};delete cancelled.receipt;d.mocks=updateSnapshot(d.mocks,cancelled,true).list;return write(d,false)}catch{return false}},recordMock(exam){if(admin===null)loadCapabilities();try{const d=read(),result=updateSnapshot(d.mocks,exam,true);d.mocks=result.list;const ok=write(d);if(!ok)toast('Full mock snapshot was not saved. Export this exam before starting another.');return ok}catch(e){toast('Could not save mock snapshot: '+e.message);return false}},deduplicateQuestions};
 document.addEventListener('keydown',handleBookletKey);
 document.addEventListener('input',e=>{if(e.target.id!=='p2written'||!bookletPack())return;const d=readBooklet(),{q}=current(d);if(!q)return;d.booklet??={};d.booklet[q.id]={...d.booklet[q.id],answer:e.target.value,at:new Date().toISOString()};writeBooklet(d)});
 document.addEventListener('change',e=>{if(e.target.name==='p2answer'&&bookletPack()){const q=displayedBookletQuestion;if(q?.id===e.target.closest('[data-question-id]')?.dataset.questionId){const d=readBooklet();d.booklet??={};d.booklet[q.id]={...d.booklet[q.id],answer:Number(e.target.value),...(q.choiceRevision?{choiceRevision:q.choiceRevision}:{}),at:new Date().toISOString()};writeBooklet(d)}}if(e.target.dataset.bookletMode&&bookletPack()){const d=readBooklet(),key=e.target.dataset.bookletMode;if(!['bookletRandom','bookletIncludeSAQ','bookletIncludeOSPE','bookletIncludeMCQ'].includes(key))return;d[key]=e.target.checked;if(key==='bookletRandom'&&d[key])randomizeBooklet(bookletPack().questions,d);delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletHistory=[];d.bookletForward=[];d.bookletQueue=[];d.position=0;writeBooklet(d);render();return}if(e.target.id==='p2filter'||e.target.id==='bookletDiscipline'){const d=readBooklet();delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletForward=[];d.bookletHistory=[];if(e.target.id==='bookletDiscipline')d.bookletDiscipline=e.target.value;else d.filter=e.target.value;d.position=0;writeBooklet(d);render()}});
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.p2Tab){if(b.dataset.p2Tab==='weak'&&window.reviewAdmin!==true)return;selected=b.dataset.p2Tab;render();return}if(b.dataset.p2Export){const m=(read().mocks||[]).find(x=>x.id===b.dataset.p2Export);if(m)downloadJSON({app:'alfaisal-review-studio-saved-mock',mock:m},'saved-mock-'+m.id+'.json');return}if(b.dataset.p2Delete){if(!confirm('Delete this saved mock and its snapshot?'))return;const d=read();d.mocks=(d.mocks||[]).filter(x=>x.id!==b.dataset.p2Delete);d.deletedMocks??={};d.deletedMocks[b.dataset.p2Delete]=new Date().toISOString();write(d);render();return}if(b.dataset.p2Retry){const m=(read().mocks||[]).find(x=>x.id===b.dataset.p2Retry);if(m&&(!globalThis.reviewArchivedStudyItem?.(m.snapshot)||globalThis.reviewCourseScope==='CVP')&&window.Phase2Practice.startRetry){try{window.Phase2Practice.startRetry(clone(m.snapshot))}catch(err){toast(err.message)}}else toast('Retry is unavailable.');return}if(b.id==='p2weak'){if(window.reviewAdmin!==true)return;const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack)await load();const d=read(),weak=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),archive?pack?.questions||[]:[...(activeBooklets.REN?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items),wrong=StudyVault.read('wrongBank',{entries:[]}).entries.filter(x=>globalThis.reviewStudyItemVisible?.(x.question)!==false);const pool=rankWeakQuestions(etMockPool(),weak,wrong);if(window.Phase2Practice.startWeighted){try{window.Phase2Practice.startWeighted(pool)}catch(err){toast(err.message)}}else toast('Weak-area mock is unavailable.');return}if(b.id==='renalMockRetry'){loadActiveBooklet(etMockScope);render();return}if(b.id==='renalBookletRetry'){loadActiveBooklet(bookletCourse());return}const booklet=bookletPack();if(!booklet||view!=='booklet')return;const d=readBooklet(),{a,q}=current(d);if(!q)return;d.booklet??={};
 if(b.id==='p2flag'||b.id==='p2saveNote'){
  const old=bookletAnnotation(q,d.bookletAnnotations),at=new Date().toISOString();
  const note=document.querySelector('#p2note')?.value;
  if(b.id==='p2saveNote'&&typeof note!=='string')return;
  const annotation=b.id==='p2flag'?{flagged:!old.flagged,flagAt:at}:{note:note.slice(0,5000),noteAt:at};
  d.bookletAnnotations=mergeBookletAnnotations(d.bookletAnnotations,{[q.id]:annotation});
  if(writeBooklet(d)){if(b.id==='p2saveNote')toast('Personal note saved.');render();}
  return;
 }
 if(b.id==='p2prev')previousBooklet(booklet.questions,d);else if(b.id==='p2next')advanceBooklet(booklet.questions,d);else if(b.id==='p2resume'){delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletForward=[];d.bookletHistory=[];d.filter='unanswered';d.position=0}else if(b.id==='p2check'){d.bookletFeedbackId=q.id;if(q.type==='mcq'&&q.options?.length){const input=document.querySelector('input[name="p2answer"]:checked');if(!input){toast('Choose an answer first.');return}const answer=Number(input.value);d.booklet[q.id]=bookletCheckResult(q,answer)}else d.booklet[q.id]={answer:document.querySelector('#p2written')?.value||'',revealed:true,at:new Date().toISOString()}}else if(b.dataset.p2Self){d.bookletFeedbackId=q.id;const {correct,...prior}=bookletEntry(q,d.booklet)||{};d.booklet[q.id]={...prior,completed:true,...(b.dataset.p2Self==='ungraded'?{}:{correct:b.dataset.p2Self==='correct'}),at:new Date().toISOString()}}else return;
 if(!writeBooklet(d))return;
 render();
 const next=b.id==='p2check'?document.querySelector('.booklet-question .answer-feedback'):document.getElementById('bookletStem');
 if(next){
  next.focus({preventScroll:true});
  revealBookletTarget(next);
 }
 });}

function loadCapabilities(){if(capabilityRequest||admin!==null)return capabilityRequest;capabilityRequest=fetch('/api/capabilities',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error('Capability unavailable');const value=await r.json();if(typeof value.admin!=='boolean')throw Error('Capability unavailable');admin=value.admin}).catch(()=>{}).finally(()=>{capabilityRequest=null});return capabilityRequest}
