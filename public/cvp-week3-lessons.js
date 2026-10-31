'use strict';
/* Reviewed source-derived additions. Do not mutate personal progress or review dates. */
(()=>{
 const sources=new Set(LEARNING.sources.map(s=>s.id));
 for(const source of CVP_WEEK3.sources)if(!sources.has(source.id))LEARNING.sources.push(source);
 const ids=new Set(LEARNING.questions.map(q=>q.id));
 for(const [id,guide] of Object.entries(CVP_WEEK3.guides)){
  TEACHING.guides[id]=guide;
  if(!guide.overview.startsWith("Supplied lecture:"))guide.overview="Supplied lecture: "+guide.title+". "+guide.overview;
  const lesson=LEARNING.lessons.find(l=>l.id===id);
  if(!lesson)throw Error('Missing existing lecture '+id);
  lesson.references??=[];
  if(!lesson.references.some(r=>r.source==='cvp-w3-'+id.slice(4).toLowerCase()))lesson.references.unshift({source:'cvp-w3-'+id.slice(4).toLowerCase(),page:1});
  lesson.scope='Expanded from the supplied lecture: '+guide.title+'. Original tracker title/dates retained.';
  lesson.sourceCoverage={source:'cvp-w3-'+id.slice(4).toLowerCase(),read:true,unreadablePages:id==='CVP-A13'?[14,22]:[],originalStorage:'Original upload handled separately; extracted source text and cropped figures available here'};
  for(const section of guide.sections){
   TOPIC_CHECKS[section.id]=section.questions;
   for(const q of section.questions)if(!ids.has(q.id)){ids.add(q.id);LEARNING.questions.push(q)}
  }
 }
 for(const [key,figures] of Object.entries(CVP_WEEK3.diagrams))DIAGRAMS[key]=figures;
 if(typeof BUILT_IN_LABELS!=='undefined')Object.assign(BUILT_IN_LABELS,CVP_WEEK3_LABELS);
 // The original renderer shows its first referenced figure; retain it and add other mapped crops.
 const previousSection=sectionCard;
 sectionCard=function(x,section,i){let markup=previousSection(x,section,i);if(!section.id?.includes(':w3-'))return markup;
  const figures=(section.references||[]).flatMap(r=>CVP_WEEK3.diagrams[r.source+':'+r.page]||[]),seen=new Set();
  const more=figures.filter(f=>{if(seen.has(f.image)||markup.includes(f.image))return false;seen.add(f.image);return true});
  if(more.length)markup=markup.replace('<div class="card-sources">',`<details class="w3-figure-gallery"><summary>More source diagrams · ${more.length}</summary>${more.map(f=>`<figure class="lesson-figure extracted-figure"><a href="${esc(f.image)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(f.image)}" width="${f.width}" height="${f.height}" alt="${esc(f.alt)}"></a><figcaption>${esc(f.caption)} · ${sourceLink({source:f.source,page:f.page})}</figcaption></figure>`).join('')}</details><div class="card-sources">`);
  return markup;
 };
 const previousPriorityLabel=priorityLabel;
 priorityLabel=function(tag){return tag.kind==='lab'?'★ Lecturer lab emphasis':tag.kind==='lecturer'?'★ Lecturer emphasis':previousPriorityLabel(tag)};
 const previousCoverage=coverageSummary;
 coverageSummary=function(l){if(!l.sourceCoverage)return previousCoverage(l);const s=sourceById(l.sourceCoverage.source);return `<div class="coverage-summary"><span class="coverage-good">Supplied lecture · ${s.pages.length} ${s.unit}s reviewed${l.sourceCoverage.unreadablePages.length?' · '+l.sourceCoverage.unreadablePages.length+' black/unreadable pages flagged':''}</span><button data-open-page="${esc(s.id)}" data-page="1">Read source text & notes</button><small>Extracted text and cropped source figures included. Original file storage is separate.</small></div>`};
 inlineLessonCache.clear();
 if(typeof render==='function')render();
})();
