import {courses} from './course-registry.mjs';
let selectedBatch,selectedKind,selectedCourse,search;
export function resetCatalog(){
 selectedBatch='all';selectedKind='all';selectedCourse='CVP';search='';
}
resetCatalog();
export function catalogKind(set){if(/shams/i.test(set.id+' '+set.title))return 'other';if(set.adapted||/^cvp19-(?:saq|ospe)-/i.test(set.id||'')||/corrected\s+booklet/i.test(set.title||''))return 'other';if(set.category==='tbl'||/\btbl\b/i.test(set.title||''))return 'tbl';if(set.category==='batch'||set.category==='exam'&&!set.adapted)return 'past';return 'other'}
export function isBookletSet(set){return /^cvp19-(?!tbl)/.test(set.id||'')||/corrected\s+booklet/i.test(set.title||'')||set.source==='cvp19-corrected'}
export function catalogCourse(set){return Object.hasOwn(courses,set.course)?set.course:/^ren(?:al)?[-_]/i.test(set.id||'')?'REN':/\bMOL\b|^mol[-_]/i.test((set.id||'')+' '+(set.title||''))?'MOL':'CVP'}
export function visibleCatalogSets(sets,kind='all',course=selectedCourse){return (sets||[]).filter(set=>!isBookletSet(set)&&catalogCourse(set)===course&&!['other','topics'].includes(batchFor(set))&&(kind==='all'||catalogKind(set)===kind))}
export function catalogGroups(set){return /corrected\s+booklet/i.test(set.title||'')||/^cvp19-(?!tbl)/.test(set.id||'')?['topics','19']:[batchFor(set)]}
export function batchFor(set) {
 if(/shams/i.test(set.id+' '+set.title))return '19';
 if (set.category === 'topic') return 'topics';
 if (set.id === 'mol-academic-aid-mock-2026') return '19';
 return String(set.batch || set.title.match(/\b(\d+)(?:st|nd|rd|th) batch\b/i)?.[1] || 'other');
}

function titleFor(id) {
 if(id==='faculty')return 'Olena & Vlad';
 if(id==='other') return 'Batch unlabelled';
 if(id==='topics') return 'Topic collections';
 const n=Number(id);
 return id+([11,12,13].includes(n%100)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'))+' Batch';
}

const displayPaperTitle=title=>title.replace(/\brecalled\b\s*/gi,'').replace(/\bfinal\b/gi,'Final');

function paperCard(set) {
 const questionCount=set.ids.length;
 const batch=titleFor(batchFor(set)),title=displayPaperTitle(examSetTitle(set)),run=originalRuns[set.id];
 const renamed=settings.examNames?.[set.id];
 const displayTitle=renamed?title:title.replace(/^\d+(?:st|nd|rd|th) batch\s*[·:–-]\s*/i,'')||title;
 const action=run?(run.finishedAt?'View saved results':'Resume saved set'):set.adapted?'Open mock exam':'Open original set';
 const canRename=globalThis.reviewAdmin===true;
 return `<article${canRename?' class="assessment-paper-editable"':''}>
  ${canRename?`<button type="button" class="rename-set-button" data-rename-set="${esc(set.id)}" aria-label="Rename ${esc(title)}" title="Rename assessment">
   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 16 11-11 4 4-11 11-5 1 1-5Zm9-9 4 4"/></svg>
  </button>`:''}
  <div class="assessment-paper-copy">
   <div class="assessment-paper-meta"><span class="assessment-batch">${esc(batch)}</span><span class="pill">${questionCount} ${set.adapted?'practice':'original'} question${questionCount===1?'':'s'}</span></div>
   <h3>${esc(displayTitle)}</h3>
   ${renamed?`<small>Source: ${esc(displayPaperTitle(set.title))}</small>`:''}
  </div>
  <div class="assessment-paper-actions">
   ${set.sourceLedger?`<a href="${esc(set.sourceLedger)}" target="_blank" rel="noopener noreferrer">Corrected booklet question ledger ↗</a>`:''}
   <button type="button" class="primary" data-original-start="${esc(set.id)}">${action}</button>
  </div>
 </article>`;
}

const kinds=[['all','All'],['other','Other'],['past','Exams'],['tbl','TBLs']];

function assessmentFamily(set,kind){
 const label=set.title||'';
 if(kind==='tbl'){
  const number=Number(label.match(/\bTBL[\s-]*(\d+)/i)?.[1]||set.id?.match(/(?:^|-)tbl-(\d+)$/i)?.[1]);
  return number?{title:'TBL '+number,number}:{title:'Other TBL material'};
 }
 if(/\b(?:ospe|practicals?)\b/i.test(label))return {title:'OSPE',tail:1};
 if(/\b(?:saqs?|short answers?|written(?: questions| cases)?|clinical scenarios?)\b/i.test(label))return {title:'SAQs',tail:2};
 if(/\bmid[\s-]*term\b/i.test(label))return {title:'Midterm'};
 if(/\bfinal\b/i.test(label))return {title:'Final Exam'};
 return {title:label};
}

export function assessmentGroups(sets,schedule=[],date='',minute=0){
 const recent=(a,b)=>(Number(batchFor(b))||0)-(Number(batchFor(a))||0);
 const ordered=[...sets].sort(recent);
 const other=ordered.filter(set=>catalogKind(set)==='other');
 const groups=new Map();
 for(const set of ordered){
  const kind=catalogKind(set);
  if(kind==='other')continue;
  const {title,number,tail}=assessmentFamily(set,kind),key=kind+':'+title;
  if(!groups.has(key))groups.set(key,{title,number,tail,kind,sets:[]});
  groups.get(key).sets.push(set);
 }
 const upcoming=event=>event.date>date||event.date===date&&event.endMinute>minute;
 const byDate=(a,b)=>a.date.localeCompare(b.date)||a.endMinute-b.endMinute;
 const scheduled=schedule.filter(event=>event.kind==='tbl'&&event.number&&!event.hubCustom);
 const tblDates=new Map();
 for(const event of scheduled){
  const previous=tblDates.get(event.number);
  if(!previous||upcoming(event)&&(!upcoming(previous)||byDate(event,previous)<0)||
     !upcoming(event)&&!upcoming(previous)&&byDate(event,previous)>0)tblDates.set(event.number,event);
 }
 const future=[...tblDates.values()].filter(upcoming).sort(byDate);
 const nextNumber=future[0]?.number;
 const exams=[...groups.values()].filter(group=>group.kind==='past');
 const tbls=[...groups.values()].filter(group=>group.kind==='tbl').sort((a,b)=>{
  const left=tblDates.get(a.number),right=tblDates.get(b.number);
  const leftFuture=left&&upcoming(left),rightFuture=right&&upcoming(right);
  if(Boolean(leftFuture)!==Boolean(rightFuture))return leftFuture?-1:1;
  if(left&&right&&left.date!==right.date)return leftFuture?left.date.localeCompare(right.date):right.date.localeCompare(left.date);
  if(Boolean(left)!==Boolean(right))return left?-1:1;
  return (a.number??Infinity)-(b.number??Infinity);
 });
 const next=nextNumber?tbls.find(group=>group.number===nextNumber):null;
 if(next){next.upcoming=true;next.date=tblDates.get(nextNumber).date;}
 return [
  ...(other.length?[{kind:'other',title:'Other',sets:other}]:[]),
  ...(next?[next]:[]),...exams.filter(group=>!group.tail),...tbls.filter(group=>group!==next),
  ...exams.filter(group=>group.tail).sort((a,b)=>a.tail-b.tail),
 ];
}

export function catalog() {
 const scope=globalThis.reviewCourseScope;
 if(scope)selectedCourse=scope;else if(globalThis.reviewCvpArchived?.())selectedCourse='MOL';
 const sets=visibleCatalogSets(ORIGINAL_EXAMS.sets,'all',selectedCourse);
 if(!sets.length)return '<section class="original-library"><p class="notice">No assessments are available for this course yet.</p><button data-view="booklet">Open Booklet</button></section>';
 const batches=[...new Set(sets.map(batchFor))].sort((a,b)=>(Number(b)||0)-(Number(a)||0));
 if(!batches.includes(selectedBatch))selectedBatch='all';
 queueMicrotask(()=>mount(sets));
 return `<section class="original-library assessment-library">
  <div class="assessment-library-controls">
   <div role="group" aria-label="Assessment type">${kinds.map(([id,label])=>`<button type="button" data-assessment-kind="${id}" aria-pressed="${selectedKind===id}">${label}</button>`).join('')}</div>
   <label>Search assessments<input type="search" id="originalSearch" value="${esc(search)}" placeholder="Assessment title"></label>
   <label>Batch<select id="originalBatchFilter"><option value="all">All batches</option>${batches.map(batch=>`<option value="${esc(batch)}" ${batch===selectedBatch?'selected':''}>${esc(titleFor(batch))}</option>`).join('')}</select></label>
   ${scope?'':`<label>Course<select id="originalCourseFilter">${Object.keys(courses).filter(c=>c!=='REN'&&(c!=='CVP'||!globalThis.reviewCvpArchived?.())).map(c=>`<option value="${c}" ${selectedCourse===c?'selected':''}>${courses[c].label}</option>`).join('')}</select></label>`}
  </div>
  <p role="status" class="muted" data-assessment-count></p><div data-assessment-results></div>
 </section>`;
}

function mount(sets) {
 const panel=document.querySelector('.assessment-library');
 if(!panel||panel.dataset.mounted)return;
 panel.dataset.mounted='true';
 const results=panel.querySelector('[data-assessment-results]');
 const count=panel.querySelector('[data-assessment-count]');
 const types=Array.from(panel.querySelectorAll('[data-assessment-kind]'));
 const schedule=AssessmentPlan.catalog(DATA.events,DATA.items).filter(event=>event.course===selectedCourse);
 function paint(){
  const clock=assessmentClock();
  const term=search.trim().toLowerCase();
  const filtered=sets.filter(set=>(selectedBatch==='all'||batchFor(set)===selectedBatch)
   &&(selectedKind==='all'||selectedKind===catalogKind(set))
   &&[examSetTitle(set),set.title].some(value=>displayPaperTitle(String(value||'')).toLowerCase().includes(term)));
  count.textContent=filtered.length+(filtered.length===1?' assessment':' assessments');
  results.innerHTML=assessmentGroups(filtered,schedule,clock.date,clock.minute).map(group=>`
   <section class="assessment-library-group" data-assessment-family="${group.kind}" ${group.upcoming?'data-upcoming':''}>
    <div class="assessment-family-heading"><h2>${esc(group.title)}</h2>${group.upcoming?`<span>Upcoming · ${esc(fmt(group.date))}</span>`:''}</div>
    <div class="original-set-grid">${group.sets.map(paperCard).join('')}</div>
   </section>`).join('')||'<p class="notice">No assessments match these filters.</p>';
  for(const button of types)button.setAttribute('aria-pressed',String(button.dataset.assessmentKind===selectedKind));
 }
 panel.querySelector('#originalSearch').addEventListener('input',event=>{search=event.target.value;paint()});
 panel.querySelector('#originalBatchFilter').addEventListener('change',event=>{selectedBatch=event.target.value;paint()});
 panel.querySelector('#originalCourseFilter')?.addEventListener('change',event=>{selectedCourse=event.target.value;selectedBatch='all';render()});
 for(const button of types)button.addEventListener('click',()=>{selectedKind=button.dataset.assessmentKind;paint()});
 paint();
}
