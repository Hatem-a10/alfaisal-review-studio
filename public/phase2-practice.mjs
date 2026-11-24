import {loadRenalBooklet} from './renal-booklet-data.mjs';
import {activeBookletPaths,bookletLoader} from './active-booklet-core.mjs';
import {bookletSections} from './renal-study.mjs';
import {withQuestionContext,load as loadCvpBooklet} from './cvp19-booklet.mjs';
import {formulaPage,installFormulas} from './formulas-practice.mjs';
import {bookletEntry,resolveBookletNavigation,deduplicateQuestions,analytics,rankWeakQuestions,updateSnapshot,coverageAudit,selectBooklet,advanceBooklet,previousBooklet,enforceHistoryLimit,randomizeBooklet} from './phase2-practice-core.mjs';
export {deduplicateQuestions,analytics,rankWeakQuestions,updateSnapshot,coverageAudit,selectBooklet,advanceBooklet,previousBooklet,enforceHistoryLimit,randomizeBooklet} from './phase2-practice-core.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bookletAnswerDetails(q,state){if(!state.completed||q.type!=='mcq'||!Array.isArray(q.options))return '';const accepted=(q.acceptedAnswers||[q.answer]).filter(i=>Number.isInteger(i)&&i>=0&&i<q.options.length);if(!accepted.length)return '';const answers=accepted.map(i=>`${String.fromCharCode(65+i)}. ${escapeHTML(q.options[i])}`).join(' / '),label=q.answer===null?'Accepted source alternatives (self-check):':'Correct answer:';const reasons=Array.isArray(q.reasons)&&q.reasons.some(Boolean)?`<details><summary>Why each option fits or fails</summary>${q.options.map((o,i)=>`<p><b>${String.fromCharCode(65+i)}. ${escapeHTML(o)}</b><br>${escapeHTML(q.reasons[i]||'')}</p>`).join('')}</details>`:'';return `<p><strong>${label} ${answers}</strong></p>${reasons}`}
export function bookletCheckResult(q,answer,at=new Date().toISOString()){if(!Array.isArray(q?.options)||!Number.isInteger(answer)||answer<0||answer>=q.options.length)throw Error('Invalid booklet selection');return q.answer===null?{answer,revealed:true,at}:{answer,correct:(q.acceptedAnswers||[q.answer]).includes(answer),completed:true,at}}
const bookletCourse=()=>globalThis.reviewBookletCourse?.()||'CVP';
const isRenalBooklet=()=>bookletCourse()==='REN';
const activeBookletLoaders={
 MOL:bookletLoader(activeBookletPaths.MOL,{version:3,pages:261,mcqs:874}),
 REN:bookletLoader(activeBookletPaths.REN,{version:3,pages:294,mcqs:645}),
};
const activeBooklets={},bookletRequests={},bookletErrors=new Set();
function loadActiveBooklet(course){
 if(activeBooklets[course]||bookletRequests[course])return;
 bookletErrors.delete(course);
 bookletRequests[course]=activeBookletLoaders[course]().then(value=>{
  activeBooklets[course]=value;
 }).catch(error=>{bookletErrors.add(course);toast(error.message)}).finally(()=>{
  delete bookletRequests[course];
  if(view==='booklet'&&bookletCourse()===course)render();
 });
}
// Existing exam and topic-practice keys keep their separate printed-key source.
let renalPack,renalLoading,renalMockBank=[],renalError=false;
function loadRenal(){
 if(renalPack)return Promise.resolve(renalPack);
 return renalLoading??=loadRenalBooklet().then(value=>{
  const bank=value.questions.filter(q=>q.type==='mcq'&&!q.figures?.length).map(q=>({...q,lectureIds:['REN-Booklet'],kind:'Past paper · printed key',concept:q.discipline,reasons:Array.isArray(q.reasons)&&q.reasons.length===q.options.length?q.reasons:q.options.map(()=>''),preserveOptionOrder:true}));
  renalPack=value;renalMockBank=bank;renalError=false;
  if(view==='practice'&&window.reviewCourseScope==='REN')render();
  return value;
 }).catch(error=>{renalLoading=null;renalError=true;toast(error.message);if(view==='practice'&&window.reviewCourseScope==='REN')render();return null;});
}
const renalPracticeQuestions=()=> {
 if(!renalPack&&!renalError)loadRenal();
 return renalMockBank;
};
const bookletPack=()=>activeBooklets[bookletCourse()]||(bookletCourse()==='CVP'?pack:null);
const startNav={filter:'unanswered',position:0};
const navigationKey=()=>({REN:'renalNavigation',MOL:'molNavigation'})[bookletCourse()];
function readBooklet(){
 const d=read(),key=navigationKey();
 if(!key)return d;
 const state={...startNav,...d[key],booklet:d.booklet||{}};
 const questions=bookletPack()?.questions;
 return questions?resolveBookletNavigation(questions,state):state;
}
function writeBooklet(d){
 const key=navigationKey();
 if(!key)return write(d);
 const {booklet,...nav}=d;
 return write({...read(),booklet,[key]:{...nav,at:new Date().toISOString()}},false);
}

let pack=null,loading=null,selected='main',admin=null,installed=false,capabilityRequest=null;
function read(){return storeOptions().phase2Practice||{booklet:{},mocks:[],filter:'unanswered',position:0}}
function write(d,navigate=true){if(navigate)d.navigationAt=new Date().toISOString();const o=storeOptions();o.phase2Practice=d;if(JSON.stringify(o).length>6900000){toast('Account storage limit reached; remove a saved mock before adding more.');return false}try{saveOptions(o);return true}catch(e){toast('Could not save practice progress: '+e.message);return false}}
function load(){if(!loading)loading=loadCvpBooklet().then(p=>{pack=p;render()}).catch(e=>{loading=null;toast(e.message)});return loading}
function current(d){const pack=bookletPack(),x=selectBooklet(pack.questions,d);return {a:x.list,q:x.question?withQuestionContext(x.question,pack):null,position:x.question?Math.max(0,x.list.findIndex(q=>q.id===x.question.id)):x.position}}
function bookMarkup(){const renal=isRenalBooklet(),mol=bookletCourse()==='MOL',pack=bookletPack();
const heading=renal?'REN 123 · Booklet':mol?'MOL 114 · 18th Batch Booklet':'Corrected 19th booklet';
const original=mol?'/api/site-assets/materials/mol114/18th-booklet.pdf':'/api/site-assets/materials/ren123/past-paper-booklet.pdf';
const source=renal?'<details class="renal-source-index"><summary>Full source booklet · MCQs, SAQs and OSPE</summary><p><a href="'+original+'" target="_blank" rel="noopener">Open full PDF ↗</a></p>'+
 bookletSections.map(([section,entries])=>'<details><summary>'+section+'</summary><ul>'+entries.map(([label,page])=>'<li><a href="'+original+'#page='+page+'" target="_blank" rel="noopener">'+escapeHTML(label)+'</a></li>').join('')+'</ul></details>').join('')+'</details>':mol?'<details class="renal-source-index"><summary>MOL 114 source booklet</summary><p><a href="'+original+'" target="_blank" rel="noopener">Full PDF ↗</a></p><ul>'+
 (pack?.chapters||[]).map(chapter=>'<li><a href="'+original+'#page='+Number(chapter.page)+'" target="_blank" rel="noopener">MOL '+Number(chapter.number)+' · '+escapeHTML(chapter.title)+'</a></li>').join('')+
 '<li><a href="'+original+'#page=234" target="_blank" rel="noopener">Written cases ↗</a></li><li><a href="'+original+'#page=260" target="_blank" rel="noopener">Lab ↗</a></li></ul></details>':'';
if(!pack){
 const failed=bookletErrors.has(bookletCourse());
 if(renal||mol){if(!failed)loadActiveBooklet(bookletCourse())}else load();
 return '<section class="panel">'+(failed?'Booklet questions could not load. <button id="renalBookletRetry">Retry</button>':'Loading booklet…')+source+'</section>';
}
const d=readBooklet(),{a,q,position}=current(d),completed=pack.questions.filter(q=>{const x=bookletEntry(q,d.booklet);return x?.completed&&x.correct!==false}).length;
const inventory=pack.counts?'<p>'+pack.counts.mcq+' unique MCQs'+(pack.counts.saq?' · '+pack.counts.saq+' written questions':'')+(pack.counts.ospe?' · '+pack.counts.ospe+' OSPE questions':'')+'</p>':'';
if(!q)return `<section class="panel"><h2>${heading}</h2>${inventory}${source}${filters(d)}<p>No questions in this filter.</p></section>`;const stored=bookletEntry(q,d.booklet)||{},retry=stored.correct===false&&d.bookletFeedbackId!==q.id,v=retry?{...stored,completed:false,revealed:false}:stored,index=pack.questions.findIndex(x=>x.id===q.id);
window.reviewNoteBookletPosition?.(bookletCourse(),q,index);return `<section class="panel" data-question-id="${escapeHTML(q.id)}"${window.reviewReportAttrs?.(q,{course:bookletCourse(),paper:heading})||''} data-question-context="${v.completed||v.revealed?'review':'practice'}"><h2>${heading}</h2>${inventory}${source}<p>${completed} / ${pack.questions.length} completed · source question ${index+1} / ${pack.questions.length}</p>${filters(d)}<p>${d.bookletFeedbackId?'Answer review':'Showing '+(position+1)+' / '+a.length} · ${escapeHTML(q.group||q.type)} · ${renal||mol?`<a href="${original}#page=${Number(q.page)}" target="_blank" rel="noopener">Source page ${Number(q.page)} ↗</a>`:`page ${q.page}`}</p>${repeatedSourceMarkup(q,original)}${q.missingFigure?'<p class="notice">Check the source page for any figure or context needed to answer this question.</p>':''}${q.caseText?`<div class="original-case"><b>Case context</b><p style="white-space:pre-wrap">${escapeHTML(q.caseText)}</p></div>`:''}<h3 style="white-space:pre-wrap">${escapeHTML(q.question)}</h3>${(q.figures||[]).map(f=>`<img src="${escapeHTML(f.image)}" alt="Booklet question figure" ${f.width&&f.height?`width="${Number(f.width)}" height="${Number(f.height)}"`:""} style="max-width:100%;height:auto">`).join('')}${q.type==='mcq'&&q.options?.length?q.options.map((o,i)=>`<label class="answer-option ${v.completed?((q.acceptedAnswers||[q.answer]).includes(i)?'correct':v.answer===i?'incorrect':''):''}"><input type="radio" name="p2answer" value="${i}" ${v.answer===i?'checked':''} ${v.completed?'disabled':''}> ${escapeHTML(o)}</label>`).join(''):`<label>Your answer<textarea id="p2written" rows="4">${escapeHTML(v.answer||'')}</textarea></label>`}${v.completed?`<div class="answer-feedback"><strong>${typeof v.correct==='boolean'?(v.correct?'Correct':'Review answer'):'Self-check completed'}</strong><p style="white-space:pre-wrap">${escapeHTML((q.type==='mcq'?q.explanation:q.sourceExplanation)||q.explanation||q.printedAnswer||'No answer supplied in the source.')}</p>${bookletAnswerDetails(q,v)}${q.sourceIssue?`<p class="notice">${escapeHTML(q.sourceIssue)}</p>`:''}</div>`:`<button id="p2check" class="primary">${q.type==='mcq'&&q.answer!==null?'Check answer':'Reveal source answer'}</button>`}${v.revealed&&!v.completed?`<div class="answer-feedback"><p style="white-space:pre-wrap">${escapeHTML(q.sourceExplanation||q.explanation||q.printedAnswer||'No answer supplied in the source.')}</p>${bookletAnswerDetails(q,{completed:true})}${q.sourceIssue?`<p class="notice">${escapeHTML(q.sourceIssue)}</p>`:''}<button data-p2-self="correct">I got it right</button> <button data-p2-self="incorrect">Review again</button> <button data-p2-self="ungraded">Mark complete without grading</button></div>`:''}<p class="section-sub booklet-shortcuts">A–E / 1–5 or ↑ ↓ choose · Enter / → check or continue · ← back</p><div class="et-exam-actions"><button id="p2prev" ${!d.bookletHistory?.length&&(d.position||0)<=0?'disabled':''}>Previous</button><button id="p2next" ${!v.completed&&position>=a.length-1&&!d.bookletForward?.length?'disabled':''}>Next</button><button id="p2resume">First unanswered</button></div></section>`}
function repeatedSourceMarkup(q,pdf){
 const locations=q.sourceLocations||[];
 if(locations.length<2)return '';
 return `<details><summary>Booklet appearances (${locations.length})</summary><ul>${locations.map(loc=>`<li><a href="${pdf}#page=${loc.page}" target="_blank" rel="noopener">${escapeHTML(loc.section)}${loc.number!=null?' · Q'+escapeHTML(loc.number):''} · p. ${loc.page}</a></li>`).join('')}</ul></details>`;
}
function filters(d){const mol=bookletCourse()==='MOL',subjects=mol?[...(activeBooklets.MOL?.chapters||[]).map(chapter=>'MOL '+chapter.number),'Written cases','Lab']:['Physiology','Anatomy','Histology','Embryology'];return `<div class="booklet-filters"><div class="booklet-modes">${[['bookletIncludeMCQ','Include MCQs',d.bookletIncludeMCQ!==false],['bookletRandom','Random order',!!d.bookletRandom],['bookletIncludeSAQ','Include SAQs',d.bookletIncludeSAQ!==false],...(mol?[]:[['bookletIncludeOSPE','Include OSPE',d.bookletIncludeOSPE!==false]])].map(([key,label,on])=>`<label><input type="checkbox" data-booklet-mode="${key}" ${on?'checked':''}><span>${label}</span></label>`).join('')}</div><label>Show <select id="p2filter">${[['all','All questions'],['unanswered','Unanswered'],['wrong','Wrong'],['completed','Completed']].map(([v,l])=>`<option value="${v}" ${d.filter===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Subject <select id="bookletDiscipline">${['all',...subjects].map(v=>`<option value="${v}" ${(d.bookletDiscipline||'all')===v?'selected':''}>${v==='all'?'All subjects':v}</option>`).join('')}</select></label></div>`}
function previousMarkup(){const d=read();return `<section class="panel"><h2>Previous mocks</h2><p>Exact question and option snapshots, saved with your account. Saved attempts are retained within your account storage limit. Export a backup before explicitly deleting an attempt.</p>${(d.mocks||[]).filter(m=>!globalThis.reviewArchivedStudyItem?.(m.snapshot)||globalThis.reviewCourseScope==='CVP').map(m=>{const s=m.snapshot,answered=s.questions.filter((q,i)=>Number.isInteger(s.answers?.[i])&&s.answers[i]>=0&&s.answers[i]<q.options.length).length,correct=s.questions.reduce((n,q,i)=>n+(s.answers?.[i]===q.answer),0);return `<article><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.createdAt)} · ${s.cancelled?'Cancelled · no result recorded':s.finishedAt?(s.excludedLowScore?'Below 15% · excluded from scores':correct+' / '+answered+' correct'):'In progress'}</p><p>${(m.attempts||[s]).filter(x=>x.finishedAt&&!x.cancelled).map((x,i)=>{const n=x.questions.filter((q,i)=>Number.isInteger(x.answers?.[i])&&x.answers[i]>=0&&x.answers[i]<q.options.length).length,c=x.questions.reduce((v,q,j)=>v+(x.answers?.[j]===q.answer),0);return `Attempt ${i+1}: ${x.excludedLowScore?'below 15% · excluded':c+' / '+n}`}).join(' · ')}</p><button data-p2-retry="${escapeHTML(m.id)}">Retry same questions</button> <button data-p2-export="${escapeHTML(m.id)}">Export saved mock</button> <button data-p2-delete="${escapeHTML(m.id)}">Delete saved mock</button></article>`}).join('')||'<p>No saved mocks yet.</p>'}</section>`}
function weakMarkup(){const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack){load();return '<section class="panel">Loading analytics…</section>'}
 const d=read(),rows=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),
  archive?pack.questions:[...(activeBooklets.REN?.questions||renalPack?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items.filter(x=>archive||x.course!=='CVP'));return `<section class="panel"><h2>Weak areas</h2><p>Graded MCQs, self-assessed short answers and eligible mocks.</p>${rows.slice(0,25).map(r=>`<p>${escapeHTML(r.id)} · ${r.correct}/${r.total} · ${Math.round(r.accuracy*100)}%</p>`).join('')||'<p>Complete questions to see weak areas.</p>'}<button id="p2weak" ${rows.length?'':'disabled'}>Practice weakest areas</button><details><summary>Question coverage in the current mock generator</summary><p>Lectures with no eligible question in the current generator pool:</p>${coverageAudit(DATA.items.filter(x=>archive?x.course==='CVP'||x.course==='MOL':x.course!=='CVP'),deduplicateQuestions(ExamEngine.pool(etBank(),'all','all'))).map(x=>`<p>${escapeHTML(x.id)} · ${escapeHTML(x.title)}</p>`).join('')||'<p>Every listed lecture has at least one eligible question.</p>'}<p>Mapping coverage does not guarantee that a generated mock will select every lecture.</p></details></section>`}
function weakPreview(){const d=read();const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack&&Object.keys(d.booklet||{}).length)load();
 const rows=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),
  archive?pack?.questions||[]:[...(activeBooklets.REN?.questions||renalPack?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items.filter(x=>archive||x.course!=='CVP')).filter(x=>!x.id.startsWith('Discipline: ')).slice(0,3);if(!rows.length)return '';return `<section class="panel"><h2>Weakest lectures</h2>${rows.map(r=>`<p>${escapeHTML(r.id)} · ${Math.round(r.accuracy*100)}% (${r.correct}/${r.total})</p>`).join('')}<button id="p2weak" class="primary">Practice weakest lectures</button></section>`}
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
 const savedPaper=originalRun&&!originalRun.finishedAt&&visibleOriginalRun();
 const savedMock=etExam&&!etExam.finishedAt&&(!window.reviewArchivedStudyItem?.(etExam)||window.reviewCourseScope==='CVP');
 return `<div class="practice-start">
  <h1>Practice Home</h1>
  ${savedMock||savedPaper?`<div class="practice-resume">
   ${savedMock?'<button type="button" class="primary" data-et-tab="mock">Resume timed mock</button>':''}
   ${savedPaper?'<button type="button" class="primary" data-et-tab="original">Resume previous paper</button>':''}
  </div>`:''}
  <div class="practice-start-actions">${practiceCards.filter(([id])=>toolAvailable(id)).map(([id,title,description,icon,extra])=>`<button type="button" class="practice-tool-card" data-${extra?'p2':'et'}-tab="${id}"><span class="practice-card-icon" aria-hidden="true">${navGlyph(icon)}</span><span><strong>${title}</strong><small>${description}</small></span><span class="practice-card-arrow" aria-hidden="true">›</span></button>`).join('')}</div>
 </div>`;
}
export function install(){if(installed)return;installed=true;window.reviewRenalPracticeQuestions=renalPracticeQuestions;window.reviewRenalPracticeLoadStatus=()=>renalError?'error':renalPack?'ready':'loading';installFormulas();
 window.reviewResetPracticePage=()=>{selected='main';};
 practice=function(){
  if(selected!=='main'&&!toolAvailable(selected))selected='main';
  if(etPracticeTab==='start'&&selected==='main')return practiceStart();
  const tool=selected==='main'?etPracticeTab:selected;
  const markup=tool==='formulas'?formulaPage():tool==='previous'?previousMarkup():tool==='weak'?weakPreview()+weakMarkup():etPracticeWorkspace();
  return practiceNavigation(practiceTools.get(tool)?.[1]||'Practice',markup);
 };
 document.addEventListener('click',e=>{if(e.target.closest('[data-et-tab],button[data-view=practice]'))selected='main'},true);
 loadCapabilities();window.addEventListener('review-admin-role',e=>{if(typeof e.detail?.admin==='boolean'){admin=e.detail.admin;if(!admin&&selected==='weak')selected='main';if(view==='practice')render()}});window.addEventListener('focus',()=>{if(admin===null)loadCapabilities()});window.Phase2Practice={booklet:()=>'<div class="phase2-booklet">'+practiceBack()+bookMarkup()+'</div>',startRetry(snapshot){selected='main';window.Phase2Exam.start(snapshot.questions,snapshot.questions.length,snapshot.minutes||60,{scope:'Retry · '+(snapshot.scope||'Mock'),accurate:snapshot.accurate,selectedLessons:snapshot.selectedLessons,parentMockId:snapshot.parentMockId||snapshot.id},true)},startWeighted(pool){if(window.reviewAdmin!==true)return;const course=etMockScope==='CVP'?'CVP':'MOL';pool=pool.filter(q=>q.lectureIds?.length&&q.lectureIds.every(id=>id.startsWith(course+'-')));selected='main';const count=Math.min(100,pool.length);if(!count){toast('No eligible questions found.');return}window.Phase2Exam.start(pool.slice(0,count),count,Math.max(1,count),{scope:'Weak areas'})},cancelMock(exam){try{const d=read(),parent=exam.parentMockId||exam.id;if(!(d.mocks||[]).some(m=>m.id===parent&&(m.attempts||[m.snapshot]).some(a=>a?.id===exam.id)))return true;const cancelled={...exam,answers:{},flags:{},xp:{},finishedAt:new Date().toISOString(),reason:'cancelled',excludedLowScore:true,cancelled:true,trackerRecorded:true};delete cancelled.receipt;d.mocks=updateSnapshot(d.mocks,cancelled,true).list;return write(d,false)}catch{return false}},recordMock(exam){if(admin===null)loadCapabilities();try{const d=read(),result=updateSnapshot(d.mocks,exam,true);d.mocks=result.list;const ok=write(d);if(!ok)toast('Full mock snapshot was not saved. Export this exam before starting another.');return ok}catch(e){toast('Could not save mock snapshot: '+e.message);return false}},deduplicateQuestions};
 document.addEventListener('keydown',e=>{if(view!=='booklet'||e.metaKey||e.ctrlKey||e.altKey||(e.repeat&&!['ArrowUp','ArrowDown'].includes(e.key))||e.target.closest('textarea,select,[contenteditable=true],input:not([type=radio]):not([type=checkbox])')||document.querySelector('dialog[open]'))return;let button;if(/^[a-e1-5]$/i.test(e.key)){const n=/^[1-5]$/.test(e.key)?Number(e.key)-1:e.key.toUpperCase().charCodeAt(0)-65;document.querySelectorAll('input[name=p2answer]')[n]?.click();e.preventDefault();return}if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const choices=[...document.querySelectorAll('input[name=p2answer]:not(:disabled)')];if(choices.length){const at=choices.findIndex(x=>x.checked),n=at<0?(e.key==='ArrowDown'?0:choices.length-1):(at+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[n].click();choices[n].focus({preventScroll:true})}return}if(e.key==='ArrowRight'){e.preventDefault();button=document.querySelector('input[name=p2answer]:checked')?document.getElementById('p2check')||document.getElementById('p2next'):document.getElementById('p2next')}if(e.key==='ArrowLeft')button=document.getElementById('p2prev');if(e.key==='Enter')button=document.getElementById('p2check')||document.getElementById('p2next');if(button&&!button.disabled){e.preventDefault();button.click()}});
 document.addEventListener('input',e=>{if(e.target.id!=='p2written'||!bookletPack())return;const d=readBooklet(),{q}=current(d);if(!q)return;d.booklet??={};d.booklet[q.id]={...d.booklet[q.id],answer:e.target.value,at:new Date().toISOString()};writeBooklet(d)});
 document.addEventListener('change',e=>{if(e.target.name==='p2answer'&&bookletPack()){const d=readBooklet(),{q}=current(d);if(q){d.booklet??={};d.booklet[q.id]={...d.booklet[q.id],answer:Number(e.target.value),at:new Date().toISOString()};writeBooklet(d)}}if(e.target.dataset.bookletMode&&bookletPack()){const d=readBooklet(),key=e.target.dataset.bookletMode;if(!['bookletRandom','bookletIncludeSAQ','bookletIncludeOSPE','bookletIncludeMCQ'].includes(key))return;d[key]=e.target.checked;if(key==='bookletRandom'&&d[key])randomizeBooklet(bookletPack().questions,d);delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletHistory=[];d.bookletForward=[];d.bookletQueue=[];d.position=0;writeBooklet(d);render();return}if(e.target.id==='p2filter'||e.target.id==='bookletDiscipline'){const d=readBooklet();delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletForward=[];d.bookletHistory=[];if(e.target.id==='bookletDiscipline')d.bookletDiscipline=e.target.value;else d.filter=e.target.value;d.position=0;writeBooklet(d);render()}});
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.p2Tab){if(b.dataset.p2Tab==='weak'&&window.reviewAdmin!==true)return;selected=b.dataset.p2Tab;render();return}if(b.dataset.p2Export){const m=(read().mocks||[]).find(x=>x.id===b.dataset.p2Export);if(m)downloadJSON({app:'alfaisal-review-studio-saved-mock',mock:m},'saved-mock-'+m.id+'.json');return}if(b.dataset.p2Delete){if(!confirm('Delete this saved mock and its snapshot?'))return;const d=read();d.mocks=(d.mocks||[]).filter(x=>x.id!==b.dataset.p2Delete);d.deletedMocks??={};d.deletedMocks[b.dataset.p2Delete]=new Date().toISOString();write(d);render();return}if(b.dataset.p2Retry){const m=(read().mocks||[]).find(x=>x.id===b.dataset.p2Retry);if(m&&(!globalThis.reviewArchivedStudyItem?.(m.snapshot)||globalThis.reviewCourseScope==='CVP')&&window.Phase2Practice.startRetry){try{window.Phase2Practice.startRetry(clone(m.snapshot))}catch(err){toast(err.message)}}else toast('Retry is unavailable.');return}if(b.id==='p2weak'){if(window.reviewAdmin!==true)return;const archive=globalThis.reviewCourseScope==='CVP'||!globalThis.reviewCvpArchived?.();
 if(archive&&!pack)await load();const d=read(),weak=analytics(d.booklet,(d.mocks||[]).filter(m=>archive||!globalThis.reviewArchivedStudyItem?.(m.snapshot)),archive?pack?.questions||[]:[...(activeBooklets.REN?.questions||renalPack?.questions||[]),...(activeBooklets.MOL?.questions||[])],DATA.items),wrong=StudyVault.read('wrongBank',{entries:[]}).entries.filter(x=>globalThis.reviewStudyItemVisible?.(x.question)!==false);const pool=rankWeakQuestions([...wrong.map(x=>x.question),...etMockPool()],weak,wrong);if(window.Phase2Practice.startWeighted){try{window.Phase2Practice.startWeighted(pool)}catch(err){toast(err.message)}}else toast('Weak-area mock is unavailable.');return}if(b.id==='renalMockRetry'){renalError=false;loadRenal();render();return}if(b.id==='renalBookletRetry'){loadActiveBooklet(bookletCourse());return}const booklet=bookletPack();if(!booklet||view!=='booklet')return;const d=readBooklet(),{a,q}=current(d);if(!q)return;d.booklet??={};if(b.id==='p2prev')previousBooklet(booklet.questions,d);else if(b.id==='p2next')advanceBooklet(booklet.questions,d);else if(b.id==='p2resume'){delete d.bookletFeedbackId;delete d.bookletViewId;d.bookletForward=[];d.bookletHistory=[];d.filter='unanswered';d.position=0}else if(b.id==='p2check'){d.bookletFeedbackId=q.id;if(q.type==='mcq'&&q.options?.length){const input=document.querySelector('input[name="p2answer"]:checked');if(!input){toast('Choose an answer first.');return}const answer=Number(input.value);d.booklet[q.id]=bookletCheckResult(q,answer)}else d.booklet[q.id]={answer:document.querySelector('#p2written')?.value||'',revealed:true,at:new Date().toISOString()}}else if(b.dataset.p2Self){d.bookletFeedbackId=q.id;const {correct,...prior}=bookletEntry(q,d.booklet)||{};d.booklet[q.id]={...prior,completed:true,...(b.dataset.p2Self==='ungraded'?{}:{correct:b.dataset.p2Self==='correct'}),at:new Date().toISOString()}}else return;writeBooklet(d);render()});}

function loadCapabilities(){if(capabilityRequest||admin!==null)return capabilityRequest;capabilityRequest=fetch('/api/capabilities',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error('Capability unavailable');const value=await r.json();if(typeof value.admin!=='boolean')throw Error('Capability unavailable');admin=value.admin}).catch(()=>{}).finally(()=>{capabilityRequest=null});return capabilityRequest}
