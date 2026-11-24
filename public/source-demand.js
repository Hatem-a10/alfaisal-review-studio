'use strict';
(()=>{
 async function readBytes(stream,limit){const reader=stream?.getReader(),parts=[];let n=0;if(!reader)return new Uint8Array();try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>limit){reader.cancel().catch(()=>{});throw Error('Reading data exceeds the device limit. Open the original document.')}parts.push(value)}}finally{reader.releaseLock()}const result=new Uint8Array(n);let at=0;for(const part of parts){result.set(part,at);at+=part.byteLength}return result}
 async function decode(response){const bytes=await readBytes(response.body,24000000);if(bytes[0]===31&&bytes[1]===139){if(typeof DecompressionStream!=='function')throw Error('Update your browser to read compressed material, or open the original PDF.');const text=await readBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),64000000);return JSON.parse(new TextDecoder().decode(text))}return JSON.parse(new TextDecoder().decode(bytes))}
 const pending=new Map(),errors=new Map();
 function request(url,apply,consumer=url){
  const existing=pending.get(url);if(existing){existing.callbacks.set(consumer,apply);return existing.promise}
  errors.delete(url);const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000),entry={callbacks:new Map([[consumer,apply]])};
  entry.promise=fetch(url,{signal:controller.signal,credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Could not load this reading');return decode(r)}).then(data=>{
   for(const callback of entry.callbacks.values())try{callback(data)}catch(e){errors.set(url,e.message||'Invalid reading data')}
  }).catch(e=>errors.set(url,e.name==='AbortError'?'Loading timed out.':e.message)).finally(()=>{pending.delete(url);clearTimeout(timeout);if(view==='library')render()});
  pending.set(url,entry);return entry.promise;
 }
 function source(s){return s?.readingURL&&!s.readingLoaded}
 function readingMap(rows){if(!Array.isArray(rows))throw Error('Invalid reading data');const map=new Map();for(const p of rows){if(!p||!Number.isSafeInteger(p.page)||p.page<1||typeof p.text!=='string'||map.has(p.page))throw Error('Invalid reading data');map.set(p.page,p.text)}return map}
 function load(s){const url=s.readingURL;return request(url,rows=>{if(s.readingURL!==url)return;const map=readingMap(rows);if(!Array.isArray(s.pages)||s.pages.some(p=>!p||(!map.has(p.page)&&!p.text)))throw Error('Incomplete reading data');s.pages.forEach(p=>p.text=map.get(p.page)??p.text);s.readingLoaded=true},s)}
 function message(url){return '<div class="source-load-state" role="status">'+(errors.has(url)?esc(errors.get(url))+' <button data-retry-reading="'+esc(url)+'">Retry loading</button>':'Loading the requested lecture material…')+'</div>'}
 const documentBefore=documentPanel;documentPanel=function(){const s=LEARNING.sources.find(s=>s.id===documentId);if(source(s)){if(!errors.has(s.readingURL))load(s);const url=libraryDocumentURL(s,documentPage);return '<button id="closeDocument">← All documents</button>'+message(s.readingURL)+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Open original document ↗</a>':'')}return documentBefore()};
 const sourceBefore=sourceQuestionsPanel;sourceQuestionsPanel=function(){if(window.reviewCourseScope==='REN')return '<p>Browse the recalled Renal questions in the interactive booklet.</p><button data-view="booklet">Open Booklet</button>';if(LEARNING.sourceQuestionsURL&&!LEARNING.sourceQuestionsLoaded){if(!errors.has(LEARNING.sourceQuestionsURL))request(LEARNING.sourceQuestionsURL,rows=>{if(!Array.isArray(rows)||rows.some(q=>typeof q.id!=='string'||!Array.isArray(q.options)))throw Error('Invalid source question index');LEARNING.sourceQuestions=rows;LEARNING.sourceQuestionsLoaded=true});return message(LEARNING.sourceQuestionsURL)}return sourceBefore()};
 function checkedSearchIndex(data){
  if(!data||data.version!==1||!Array.isArray(data.pages)||!data.terms||typeof data.terms!=='object'||Array.isArray(data.terms))throw Error('Invalid search index');
  for(const p of data.pages)if(!p||typeof p.source!=='string'||!p.source||!Number.isSafeInteger(p.page)||p.page<1||typeof p.snippet!=='string')throw Error('Invalid search index page');
  for(const [term,rows] of Object.entries(data.terms))if(!term||!Array.isArray(rows)||rows.some(i=>!Number.isSafeInteger(i)||i<0||i>=data.pages.length))throw Error('Invalid search index posting');
  return data;
 }
 let searchIndex=null,searchIndexURL=null;const termCache=new Map(),termCacheMaxEntries=100,termCacheMaxBytes=2*1024*1024;let termCacheBytes=0;
 // Conservative retained-size accounting: UTF-16 key plus estimated Set entry/collection overhead.
 function termCost(term,pages){return 128+term.length*2+pages.size*32}
 function rememberTerm(term,pages){const bytes=termCost(term,pages);if(bytes>termCacheMaxBytes)return;while(termCache.size&&(termCache.size>=termCacheMaxEntries||termCacheBytes+bytes>termCacheMaxBytes)){const oldest=termCache.keys().next().value;termCacheBytes-=termCost(oldest,termCache.get(oldest));termCache.delete(oldest)}termCache.set(term,pages);termCacheBytes+=bytes}
 function pagesFor(term){if(termCache.has(term))return termCache.get(term);const seen=new Set();if(term.length===1){for(const i of searchIndex.terms[term]||[])seen.add(i)}else{for(const[word,rows]of Object.entries(searchIndex.terms))if(word.includes(term))for(const i of rows)seen.add(i)}rememberTerm(term,seen);return seen}
 // Intersect from the smallest posting set; retain the first term's insertion order for stable result ties.
 function intersectPages(sets){if(!sets.length)return [];if(sets.length===1)return [...sets[0]];const ordered=[...sets].sort((a,b)=>a.size-b.size),matches=new Set(),rest=ordered.slice(1);for(const page of ordered[0])if(rest.every(set=>set.has(page)))matches.add(page);if(!matches.size)return [];return [...sets[0]].filter(page=>matches.has(page))}
 const beforeSearch=searchPassages;searchPassages=function(){
  if(window.reviewCourseScope==='REN')return beforeSearch();
  const url=LEARNING.searchIndexURL;if(!url)return beforeSearch();
  if(searchIndexURL!==url){searchIndexURL=url;searchIndex=null;termCache.clear();termCacheBytes=0}
  if(!searchIndex){if(!errors.has(url))request(url,data=>{if(searchIndexURL===url&&LEARNING.searchIndexURL===url)searchIndex=checkedSearchIndex(data)});return message(url)}
  const terms=[...new Set(sourceSearch.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)||[])];if(!terms.length)return '<p>Enter a search term.</p>';
  let results=intersectPages(terms.map(pagesFor)).map(i=>({...searchIndex.pages[i],score:terms.length,indexed:true}));
  for(const s of LEARNING.sources.concat(uploads.map(u=>({...u,pages:uploadBodies[u.id]?.pages||[]}))))if(!s.readingURL)for(const p of s.pages||[]){const text=typeof p.text==='string'?p.text:'',normalized=text.toLowerCase().normalize('NFKC'),score=terms.filter(t=>normalized.includes(t)).length;if(score===terms.length){const starts=terms.map(t=>normalized.indexOf(t)).filter(i=>i>=0),start=Math.max(0,Math.min(text.length-1,starts.length?Math.min(...starts):0)-100);results.push({source:s.id,page:p.page,score,snippet:text.slice(start,start+650)})}}
  results=results.filter(r=>{const source=sourceById(r.source);return source&&librarySourceInCourse(source)&&libraryDocumentURL(source,r.page)});
  results.sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source)||a.page-b.page);
  if(!results.length)return '<p>No matching pages. Try a shorter term.</p>';
  return '<p class="muted">'+results.length+' matching pages · showing '+Math.min(30,results.length)+'. Search uses an index; full documents open directly.</p>'+results.slice(0,30).map(r=>{const s=sourceById(r.source);return '<article class="search-passage"><strong>'+esc(s?.displayName||s?.name||r.source)+' · '+(s?.unit==='slide'?'slide ':'PDF p')+r.page+'</strong><p>'+esc(r.snippet)+'</p>'+(r.indexed?'<small>Page preview · matched terms: '+esc(terms.join(', '))+'. Open the page for full context.</small>':'')+'<a href="'+esc(libraryDocumentURL(s,r.page))+'" target="_blank" rel="noopener noreferrer">Open full document ↗</a></article>'}).join('')||'<p>No matching pages. Try a shorter term.</p>'
 };
 const libraryBefore=library;library=function(){return window.reviewCourseScope?libraryBefore():libraryBefore().replace(/Source questions · \d+/, 'Source questions · '+(LEARNING.sourceQuestionCount??LEARNING.sourceQuestions.length))};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-retry-reading]');if(b){errors.delete(b.dataset.retryReading);render()}});
})();
