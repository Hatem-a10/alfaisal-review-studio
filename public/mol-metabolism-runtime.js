'use strict';
(()=>{
 applyMetabolismContent(LEARNING,TEACHING,TOPIC_CHECKS,DIAGRAMS,MOL_METABOLISM);
 if(typeof BUILT_IN_LABELS!=='undefined')Object.assign(BUILT_IN_LABELS,MOL_METABOLISM.labels);
 const previousCoverage=coverageSummary;
 coverageSummary=function(l){const c=l.metabolismCoverage;if(!c)return previousCoverage(l);const s=sourceById(c.slideSource);return `<div class="coverage-summary"><span class="coverage-good">${s.pages.length} supplied slides${l.id==='MOL-15'||l.id==='MOL-16'?' · shared Glycolysis I–II deck':''} · ${c.topics} taught topics</span><span>${c.noteSource?'Supplied explanations · not a verified verbatim transcript':'No separate explanatory notes supplied'}</span><button data-open-page="${c.slideSource}" data-page="1">Read slide text</button>${c.noteSource?`<button data-open-page="${c.noteSource}" data-page="1">Read supplied explanations</button>`:''}<a href="/mol-metabolism-coverage.html" target="_blank" rel="noopener noreferrer">Coverage & source corrections ↗</a></div>`};
 const previousCard=sectionCard;
 sectionCard=function(x,section,i){let html=previousCard(x,section,i);if(!MOL_METABOLISM.guides[x.id])return html;const seen=new Set(),extra=(section.references||[]).flatMap(r=>DIAGRAMS[r.source+':'+r.page]||[]).filter(f=>{if(seen.has(f.image)||html.includes(f.image))return false;seen.add(f.image);return true});if(extra.length)html=html.replace('<div class="card-sources">',`<details class="w3-figure-gallery"><summary>More source figures · ${extra.length}</summary>${extra.map(f=>`<figure class="lesson-figure extracted-figure"><a href="${esc(f.image)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(f.image)}" width="${f.width}" height="${f.height}" alt="${esc(f.alt||section.title)}"></a><figcaption>${esc(f.caption||section.title)} · ${sourceLink({source:f.source,page:f.page})}</figcaption></figure>`).join('')}</details><div class="card-sources">`);return html};
 const previousDocuments=documentPanel;
 documentPanel=function(){let html=previousDocuments();if(documentId?.startsWith('mol-met-'))html=html.replace(/Open slide PDF|Open source page/g,'Read supplied source text').replace('PDF available above','source text available above');return html};
 inlineLessonCache.clear();render();
})();
