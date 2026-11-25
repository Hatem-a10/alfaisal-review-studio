'use strict';
const originalSetQuestions=etSetQuestions;
const practiceFilters={difficulty:'',objective:'',unseen:false,figure:false};
function practiceDifficulty(q){return typeof q.difficulty==='string'&&q.difficulty.trim()?q.difficulty.trim().toLowerCase():'untagged'}
function practiceObjectives(q){return [...new Set([q.objectiveId,...Object.values(q.objectiveByLecture||{})].filter(v=>typeof v==='string'&&v))]}
function practiceSeen(records,wrong=[],booklet={}){
 const ids=new Set();
 for(const r of Object.values(records||{})){
  for(const a of r?.learning?.attempts||[])if(a.q)ids.add(a.q);
  for(const id of Object.keys(r?.learning?.results||{}))ids.add(id);
  for(const a of r?.mcqs||[]){const m=/^question:\d{4}-\d{2}-\d{2}:(.+)$/.exec(a.id||'');if(m)ids.add(m[1]);}
 }
 for(const a of wrong||[])if(a.question?.id)ids.add(a.question.id);
 for(const [id,a] of Object.entries(booklet||{}))if(a?.completed||a?.revealed||Number.isInteger(a?.answer))ids.add(id);
 return ids;
}
function filteredPractice(pool,filters,seen=new Set()){
 return pool.filter(q=>(!filters.difficulty||practiceDifficulty(q)===filters.difficulty)&&(!filters.objective||practiceObjectives(q).includes(filters.objective))&&(!filters.unseen||!seen.has(q.id))&&(!filters.figure||Boolean(q.image||(q.figures||[]).some(f=>f?.image||f?.src))));
}
function practiceCandidates(){return lessonMix.sets.enabled?mixPool('sets'):originalSetQuestions()}
function practiceFilterOptions(pool){
 const difficulty=[...new Set(pool.map(practiceDifficulty))].sort(),objectives=[...new Set(pool.flatMap(practiceObjectives))].sort();
 if(practiceFilters.difficulty&&!difficulty.includes(practiceFilters.difficulty))practiceFilters.difficulty='';
 if(practiceFilters.objective&&!objectives.includes(practiceFilters.objective))practiceFilters.objective='';
 return {difficulty,objectives};
}
etSetQuestions=function(){
 const pool=practiceCandidates();practiceFilterOptions(pool);
 const seen=practiceFilters.unseen?practiceSeen(state,typeof wrongBank==='undefined'?[]:wrongBank.entries,typeof storeOptions==='function'?storeOptions().phase2Practice?.booklet:{}):new Set();
 return filteredPractice(pool,practiceFilters,seen);
};
function practiceFilterMarkup(){
 const {difficulty,objectives}=practiceFilterOptions(practiceCandidates()),f=practiceFilters;
 const select=(label,key,values)=>'<label>'+label+'<select data-practice-filter="'+key+'"><option value="">Any</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(f[key]===v?'selected':'')+'>'+esc(v==='untagged'?'Not tagged':v)+'</option>').join('')+'</select></label>';
 return '<details class="lesson-mix" '+(f.difficulty||f.objective||f.unseen||f.figure?'open':'')+'><summary>Custom practice filters</summary><div class="et-filters">'+select('Difficulty tag','difficulty',difficulty)+select('Curriculum objective','objective',objectives)+'<label><input type="checkbox" data-practice-filter="unseen" '+(f.unseen?'checked':'')+'> No recorded answer</label><label><input type="checkbox" data-practice-filter="figure" '+(f.figure?'checked':'')+'> Contains a figure</label></div><p class="section-sub">Difficulty uses supplied tags only. No recorded answer means no saved answer evidence; older unrecorded attempts cannot be detected.</p></details>';
}
const originalMixedPanel=etConceptPanel;
etConceptPanel=function(){
 let html=originalMixedPanel();
 const marker='<p class="section-sub">First attempts';
 html=html.replace(marker,()=>practiceFilterMarkup()+marker);
 return lessonMix.sets.enabled?html.replace('in this set','in selected lessons').replace('Open question set','Open mixed lesson set'):html;
};
const originalLearningStatus=Learn.status;
Learn.status=function(l,record,d){if(!l||typeof inlineGroups!=='function')return originalLearningStatus(l,record,d);const base=originalLearningStatus(l,record,d),topics=inlineTopicsFor(l),groups=inlineGroups(l).groups,scores=groups.map(g=>inlineTopicScore(l,g,record)),known=scores.filter(s=>s.complete).length,answered=scores.reduce((n,s)=>n+s.total,0),correct=scores.reduce((n,s)=>n+s.correct,0),stats={};topics.forEach((t,i)=>{const z=scores[i];stats[t.concept||t.id]={correct:z.correct,total:z.total,accuracy:z.percent,stable:z.complete,streak:z.complete?2:0}});return {...base,known,total:topics.length,passed:topics.length>0&&known===topics.length,answered,accuracy:answered?Math.round(correct/answered*1000)/10:0,stats,label:known===topics.length?'MCQ target reached':answered?'MCQ practice in progress':'Not assessed'}};
checkpoint=function(x,l,s){const topics=inlineTopicsFor(l),groups=inlineGroups(l).groups;return `<section class="panel checkpoint-card"><h2>${s.known} / ${s.total} topics stable</h2><p>Only checked MCQ answers count. Reading, opening a topic or pressing a reading button cannot mark it stable.</p>${scoreRing(s.accuracy,'MCQ accuracy','Latest distinct answers')}${topics.map((t,i)=>{const z=inlineTopicScore(l,groups[i]);return `<div class="concept-status"><span>${esc(t.title)}</span><span>${z.total?z.correct+'/'+z.available+' · '+z.fullPercent+'% · '+(z.complete?'Stable':'Needs practice'):'No MCQs answered yet'}</span></div>`}).join('')}<button class="primary" data-learn-tab="lesson">Continue topics & questions</button></section>`};
const noReadGateSection=sectionCard;sectionCard=function(...args){return noReadGateSection(...args).replace(/<button data-guide-read="[^"]*"[^>]*>[\s\S]*?<\/button>/,'')};
document.addEventListener('change',e=>{const t=e.target,key=t.dataset?.practiceFilter;if(['difficulty','objective','unseen','figure'].includes(key)){practiceFilters[key]=key==='unseen'||key==='figure'?t.checked:t.value;etSet=null;render();return}if(t.dataset?.mixEnabled){const mode=t.dataset.mixEnabled,m=lessonMix[mode];if(!m)return;m.enabled=t.checked;if(mode==='sets')etSet=null;render();return}if(t.dataset?.mixLesson){const mode=t.dataset.mixMode,m=lessonMix[mode];if(!m)return;const rows=mixRows(mode),available=new Set(rows.map(row=>row.item.id)),id=t.dataset.mixLesson;if(!available.has(id))return;const selected=new Set(mixSelected(mode,rows));if(t.checked)selected.add(id);else selected.delete(id);m.ids=[...selected];if(mode==='sets')etSet=null;render()}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const mode=b.dataset.mixAll||b.dataset.mixClear;if(mode&&lessonMix[mode]){lessonMix[mode].ids=b.dataset.mixAll?mixRows(mode).map(row=>row.item.id):[];if(mode==='sets')etSet=null;render()}});
render();
