'use strict';
(()=>{
 applyPulmonaryContent(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,[CVP_PULMONARY_ANATOMY,CVP_PULMONARY_PHYSIOLOGY],CVP_PULMONARY_QUIZ);
 applyPulmonaryQuiz(LEARNING,TEACHING,TOPIC_CHECKS,CVP_PULMONARY_QUIZ);
 const quiz=CVP_PULMONARY_QUIZ;
 if(!ORIGINAL_EXAMS.sources.some(s=>s.id===quiz.source.id))ORIGINAL_EXAMS.sources.push(quiz.source);
 for(const q of quiz.questions)if(!ORIGINAL_EXAMS.questions.some(v=>v.id===q.id))ORIGINAL_EXAMS.questions.push(q);
 if(!ORIGINAL_EXAMS.sets.some(s=>s.id===quiz.set.id))ORIGINAL_EXAMS.sets.push(quiz.set);
 DIAGRAMS['shams-pulm-quiz1:1']=[{image:'/cvp-pulmonary-figures/quiz-compliance.webp',width:720,height:541,source:'shams-pulm-quiz1',page:1,origin:'Original question graph cropped from supplied quiz'}];
 const compliance=TEACHING.guides['CVP-P18'].sections.find(s=>s.id==='CVP-P18:pulm-compliance');if(!compliance.references.some(r=>r.source===quiz.source.id&&r.page===1))compliance.references.push({source:quiz.source.id,page:1});
 if(typeof BUILT_IN_LABELS!=='undefined')BUILT_IN_LABELS['/cvp-pulmonary-figures/quiz-compliance.webp']=[{x:27.5,y:87,w:45,h:7,label:'transmural pressure/transpulmonary pressure'},{x:12,y:25,w:5,h:40,label:'lung volume/volume'}];
 const previousCard=sectionCard;
 sectionCard=function(x,section,i){let html=previousCard(x,section,i);if(!section.id?.includes(':pulm-'))return html;const seen=new Set();const extra=(section.references||[]).flatMap(r=>DIAGRAMS[r.source+':'+r.page]||[]).filter(f=>{if(seen.has(f.image)||html.includes(f.image))return false;seen.add(f.image);return true});if(extra.length)html=html.replace('<div class="card-sources">',`<details class="w3-figure-gallery"><summary>More source figures · ${extra.length}</summary>${extra.map(f=>`<figure class="lesson-figure extracted-figure"><a href="${esc(f.image)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(f.image)}" width="${f.width}" height="${f.height}" alt="${esc(f.alt||section.title)}"></a><figcaption>${esc(f.caption||section.title)} · ${sourceLink({source:f.source,page:f.page})}</figcaption></figure>`).join('')}</details><div class="card-sources">`);return html};
 const previousOriginal=originalWorkspace;
 originalWorkspace=function(){return previousOriginal().replace(/(<a[^>]+href="\/cvp-pulmonary-reader\.html\?source=shams-pulm-quiz1"[^>]*>)Full original PDF ↗/g,'$1Read supplied quiz text ↗')};
 inlineLessonCache.clear();render();
})();
