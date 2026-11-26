import {courses} from './course-registry.mjs';
let selectedBatch,selectedKind,selectedCourse,search;
export function resetCatalog(){
 selectedBatch='all';selectedKind='all';selectedCourse='CVP';search='';
}
resetCatalog();
export function catalogKind(set){if(/shams/i.test(set.id+' '+set.title))return 'other';if(set.adapted||/^cvp19-(?:saq|ospe)-/i.test(set.id||'')||/corrected\s+booklet/i.test(set.title||''))return 'other';if(set.category==='tbl'||/\btbl\b/i.test(set.title||''))return 'tbl';if(set.category==='batch'||set.category==='exam'&&!set.adapted)return 'past';return 'other'}
export function isBookletSet(set){return /^cvp19-(?!tbl)/.test(set.id||'')||/corrected\s+booklet/i.test(set.title||'')||set.source==='cvp19-corrected'}
export function catalogCourse(set){return Object.hasOwn(courses,set.course)?set.course:/^ren(?:al)?[-_]/i.test(set.id||'')?'REN':/\bMOL\b|^mol[-_]/i.test((set.id||'')+' '+(set.title||''))?'MOL':'CVP'}
export function visibleCatalogSets(sets,kind='all',course=selectedCourse){return (sets||[]).filter(set=>!isBookletSet(set)&&catalogCourse(set)===course&&batchFor(set)!=='other'&&(kind==='all'||catalogKind(set)===kind))}
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

function paperCard(s) {
 const qs=s.ids.map(originalQuestionById).filter(Boolean),figures=qs.filter(q=>q.figures?.length).length;return `<article><span class="pill">${qs.length} ${s.adapted?"practice":"original"} question${qs.length===1?'':'s'}</span><div class="original-set-title"><h3>${esc(examSetTitle(s))}</h3><button class="rename-set-button" data-rename-set="${esc(s.id)}" aria-label="Rename ${esc(examSetTitle(s))}">✎ Rename</button></div>${settings.examNames?.[s.id]?`<small>Source: ${esc(s.title)}</small>`:''}<p>${esc(s.note||'Original wording and supplied answer key.')}</p><small>${figures} question${figures===1?'':'s'} with source figures · ${qs.filter(q=>q.type==='short').length} short answers</small><button class="primary" data-original-start="${esc(s.id)}">${originalRuns[s.id]?originalRuns[s.id].finishedAt?'View saved results':'Resume saved set':s.adapted?'Open mock exam':'Open original set'}</button><details><summary>Topic coverage</summary><button type="button" data-study-coverage="${esc(s.id)}">Show topics</button><div data-study-coverage-body></div></details>${s.sourceLedger?`<a href="${esc(s.sourceLedger)}" target="_blank" rel="noopener noreferrer">Corrected booklet question ledger ↗</a>`:""}${s.url&&!s.sourceInAssessment?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${s.id==='cvp-working-a13-p15'?'Source text & figures':'Full original PDF'} ↗</a>`:""}</article>`
}

const kinds=[['all','All'],['past','Exams'],['tbl','TBLs'],['other','Other']];

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
   <label>Search assessments<input type="search" id="originalSearch" value="${esc(search)}" placeholder="Title or topic"></label>
   <label>Batch<select id="originalBatchFilter"><option value="all">All batches</option>${batches.map(batch=>`<option value="${esc(batch)}" ${batch===selectedBatch?'selected':''}>${esc(titleFor(batch))}</option>`).join('')}</select></label>
   ${scope?'':`<label>Course<select id="originalCourseFilter">${Object.keys(courses).filter(c=>c!=='REN'&&(c!=='CVP'||!globalThis.reviewCvpArchived?.())).map(c=>`<option value="${c}" ${selectedCourse===c?'selected':''}>${courses[c].label}</option>`).join('')}</select></label>`}
  </div>
  <p role="status" class="muted" data-assessment-count></p><div data-assessment-results></div>
  ${selectedCourse==='MOL'?'<div class="source-links"><a href="/api/site-assets/materials/mol-midterm-guide.pdf" target="_blank" rel="noopener noreferrer">MOL Midterm Guide ↗</a></div>':''}
 </section>`;
}

function mount(sets) {
 const panel=document.querySelector('.assessment-library');
 if(!panel||panel.dataset.mounted)return;
 panel.dataset.mounted='true';
 const results=panel.querySelector('[data-assessment-results]');
 const count=panel.querySelector('[data-assessment-count]');
 const types=Array.from(panel.querySelectorAll('[data-assessment-kind]'));
 const ordered=[...sets].sort((a,b)=>(Number(batchFor(b))||0)-(Number(batchFor(a))||0));
 function paint(){
  const term=search.trim().toLowerCase();
  const filtered=ordered.filter(set=>(selectedBatch==='all'||batchFor(set)===selectedBatch)
   &&(selectedKind==='all'||selectedKind===catalogKind(set))
   &&[examSetTitle(set),set.title,set.note].some(value=>String(value||'').toLowerCase().includes(term)));
  count.textContent=filtered.length+(filtered.length===1?' assessment':' assessments');
  results.innerHTML=kinds.slice(1).map(([id,label])=>{
   const group=filtered.filter(set=>catalogKind(set)===id);
   return group.length?`<section class="assessment-library-group"><h2>${label}</h2><div class="original-set-grid">${group.map(paperCard).join('')}</div></section>`:'';
  }).join('')||'<p class="notice">No assessments match these filters.</p>';
  for(const button of types)button.setAttribute('aria-pressed',String(button.dataset.assessmentKind===selectedKind));
 }
 panel.querySelector('#originalSearch').addEventListener('input',event=>{search=event.target.value;paint()});
 panel.querySelector('#originalBatchFilter').addEventListener('change',event=>{selectedBatch=event.target.value;paint()});
 panel.querySelector('#originalCourseFilter')?.addEventListener('change',event=>{selectedCourse=event.target.value;selectedBatch='all';render()});
 for(const button of types)button.addEventListener('click',()=>{selectedKind=button.dataset.assessmentKind;paint()});
 paint();
}
