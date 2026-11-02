'use strict';
/* Curriculum only: never writes state, dates, drafts, exam answers or mastery evidence. */
function applyMetabolismContent(learning,teaching,checks,diagrams,pack){
 const ids=new Set(learning.questions.map(q=>q.id));
 for(const source of pack.sources)if(!learning.sources.some(s=>s.id===source.id))learning.sources.push(source);
 const optional={'MOL-14:met-regulation-met-source-feedback':'reviewed-mol-exam-1-20','MOL-14:met-homeostasis-met-energy':'reviewed-mol-exam-1-16','MOL-14:2-met-flux':'reviewed-mol-exam-2-27'};
 for(const [id,guide]of Object.entries(pack.guides)){
  const lesson=learning.lessons.find(l=>l.id===id);if(!lesson)throw Error('Unknown metabolism lesson '+id);
  teaching.guides[id]=guide;lesson.references??=[];
  lesson.scope='Expanded from your supplied slides and explanatory notes · source-audited teaching, topic MCQs and recall activities.';
  lesson.metabolismCoverage={version:pack.version,topics:guide.sections.length,slideSource:id==='MOL-15'||id==='MOL-16'?'mol-met-15-16':'mol-met-'+id.slice(4),noteSource:id==='MOL-14'?null:id==='MOL-15'||id==='MOL-16'?'mol-met-notes-15-16':'mol-met-notes-'+id.slice(4)};
  for(const section of guide.sections){
   checks[section.id]=section.questions;
   for(const ref of section.references||[])if(!lesson.references.some(r=>r.source===ref.source))lesson.references.unshift(ref);
   for(const q of section.questions){if(optional[q.id]&&ids.has(optional[q.id]))q.duplicateOf=optional[q.id];if(!ids.has(q.id)){learning.questions.push(q);ids.add(q.id)}}
  }
 }
 Object.assign(diagrams,pack.diagrams);
}
