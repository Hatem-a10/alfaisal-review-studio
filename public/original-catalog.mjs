let selected = '19', selectedKind='all', selectedCourse='CVP';
export function catalogKind(set){if(/shams/i.test(set.id+' '+set.title))return 'other';if(set.adapted||/^cvp19-(?:saq|ospe)-/i.test(set.id||'')||/corrected\s+booklet/i.test(set.title||''))return 'other';if(set.category==='tbl'||/\btbl\b/i.test(set.title||''))return 'tbl';if(set.category==='batch'||set.category==='exam'&&!set.adapted)return 'past';return 'other'}
export function isBookletSet(set){return /^cvp19-(?!tbl)/.test(set.id||'')||/corrected\s+booklet/i.test(set.title||'')||set.source==='cvp19-corrected'}
export function catalogCourse(set){return /\bMOL\b|^mol[-_]/i.test((set.id||'')+' '+(set.title||''))?'MOL':'CVP'}
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
 const qs=s.ids.map(originalQuestionById),figures=qs.filter(q=>q.figures.length).length;return `<article><span class="pill">${qs.length} ${s.adapted?"practice":"original"} question${qs.length===1?'':'s'}</span><div class="original-set-title"><h3>${esc(examSetTitle(s))}</h3><button class="rename-set-button" data-rename-set="${esc(s.id)}" aria-label="Rename ${esc(examSetTitle(s))}">✎ Rename</button></div>${settings.examNames?.[s.id]?`<small>Source: ${esc(s.title)}</small>`:''}<p>${esc(s.note||'Original wording and supplied answer key.')}</p><small>${figures} question${figures===1?'':'s'} with source figures · ${qs.filter(q=>q.type==='short').length} short answers</small><button class="primary" data-original-start="${esc(s.id)}">${originalRuns[s.id]?originalRuns[s.id].finishedAt?'View saved results':'Resume saved set':s.adapted?'Open mock exam':'Open original set'}</button>${s.sourceLedger?`<a href="${esc(s.sourceLedger)}" target="_blank" rel="noopener noreferrer">Corrected booklet question ledger ↗</a>`:""}${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${s.id==='cvp-working-a13-p15'?'Source text & figures':'Full original PDF'} ↗</a>`:""}</article>`
}

export function catalog() {
 const grouped = new Map(['19','18','17'].map(id=>[id,[]]));
 for(const set of visibleCatalogSets(ORIGINAL_EXAMS.sets)) {
  for(const id of catalogGroups(set)){if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(set)}
 }
 const ids=[...grouped.keys()].sort((a,b)=>(Number(b)||0)-(Number(a)||0));
 queueMicrotask(()=>mount(ids,grouped));
 return `<section class="original-library batch-library"><div class="batch-controls"><span class="eyebrow muted">BROWSE BY BATCH</span><div><button type="button" data-batch-step="-1" aria-label="Previous batch card">←</button> <button type="button" data-batch-step="1" aria-label="Next batch card">→</button></div></div>
 <div class="batch-track" tabindex="0" aria-label="Swipe or use arrow keys to browse batches">${ids.map(id=>`<button type="button" class="batch-card" data-batch-card="${id}"><span>${id==='19'?'CURRENT BATCH':id==='other'?'SOURCE BATCH UNKNOWN':id==='topics'?'BROWSE BY SUBJECT':'PAST BATCH'}</span><strong>${titleFor(id)}</strong><small>${grouped.get(id).length} available set${grouped.get(id).length===1?'':'s'}</small></button>`).join('')}</div>
 <div class="batch-index" aria-label="Jump to batch">${ids.map(id=>`<button type="button" data-batch-pick="${id}">${titleFor(id)}</button>`).join('')}</div>
 <label>Course <select id="originalCourseFilter">${['CVP','MOL'].map(c=>`<option value="${c}" ${selectedCourse===c?'selected':''}>${c==='CVP'?'CVP 112':'MOL 114'}</option>`).join('')}</select></label><label>Show <select id="originalKindFilter">${[['all','All'],['past','Past Exam'],['tbl','TBL'],['other','Other']].map(([value,label])=>`<option value="${value}" ${selectedKind===value?'selected':''}>${label}</option>`).join('')}</select></label><div class="batch-papers"></div><p class="notice">Recalled papers may have missing choices or incorrect printed keys. Original mode preserves the supplied wording and order.</p>
 ${selectedCourse==='MOL'?'<div class="source-links"><a href="/api/site-assets/materials/mol-midterm-guide.pdf" target="_blank" rel="noopener noreferrer">MOL Midterm Guide ↗</a></div>':''}</section>`;
}

function mount(ids, grouped) {
 const panel=document.querySelector('.batch-library');
 if(!panel || panel.dataset.mounted)return;
 panel.dataset.mounted='true';
 const track=panel.querySelector('.batch-track'), cards=[...track.children];
 const papers=panel.querySelector('.batch-papers');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function show(id) {
  selected=id;
  const sets=visibleCatalogSets(grouped.get(id),selectedKind);
  papers.innerHTML=`<h2>${titleFor(id)} · Papers & TBLs</h2>`+(sets.length
   ? `<div class="original-set-grid">${sets.map(paperCard).join('')}</div>`
   : '<p class="notice">No sets have been identified for this batch yet.</p>');
  for(const button of panel.querySelectorAll('[data-batch-pick]'))button.setAttribute('aria-pressed',String(button.dataset.batchPick===id));
  panel.querySelector('[data-batch-step="-1"]').disabled=id===ids[0];
  panel.querySelector('[data-batch-step="1"]').disabled=id===ids.at(-1);
 }
 function move(index, instant=false) {
  const card=cards[index];
  if(card)track.scrollTo({left:card.offsetLeft,behavior:instant||reduced?'instant':'smooth'});
 }
 show(ids.includes(selected)?selected:ids[0]);
 move(ids.indexOf(selected),true);
 panel.querySelector('#originalCourseFilter').addEventListener('change',event=>{selectedCourse=event.target.value;render()});
 panel.querySelector('#originalKindFilter').addEventListener('change',event=>{selectedKind=event.target.value;show(selected)});
 track.addEventListener('scroll',()=>{
  const nearest=cards.reduce((a,b)=>Math.abs(b.offsetLeft-track.scrollLeft)<Math.abs(a.offsetLeft-track.scrollLeft)?b:a);
  if(nearest.dataset.batchCard!==selected)show(nearest.dataset.batchCard);
 },{passive:true});
 panel.addEventListener('click',event=>{
  const button=event.target.closest('[data-batch-step],[data-batch-card],[data-batch-pick]');
  if(!button)return;
  const id=button.dataset.batchCard||button.dataset.batchPick;
  if(id===selected && button.dataset.batchCard)papers.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
  else move(id?ids.indexOf(id):ids.indexOf(selected)+Number(button.dataset.batchStep));
 });
 track.addEventListener('keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  event.preventDefault();
  move(ids.indexOf(selected)+(event.key==='ArrowLeft'?-1:1));
 });
}
