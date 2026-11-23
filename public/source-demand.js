'use strict';
(()=>{
 async function decode(response){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===31&&bytes[1]===139){if(typeof DecompressionStream!=='function')throw Error('Update your browser to read compressed material, or open the original PDF.');return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()}return JSON.parse(new TextDecoder().decode(bytes))}
 const pending=new Map(),errors=new Map();
 function request(url,apply){if(pending.has(url))return pending.get(url);errors.delete(url);const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000),p=fetch(url,{signal:controller.signal,credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Could not load this reading');return decode(r)}).then(data=>{apply(data);pending.delete(url);if(view==='library')render()}).catch(e=>{pending.delete(url);errors.set(url,e.name==='AbortError'?'Loading timed out.':e.message);if(view==='library')render()}).finally(()=>clearTimeout(timeout));pending.set(url,p);return p}
 function source(s){return s?.readingURL&&!s.readingLoaded}
 function load(s){return request(s.readingURL,rows=>{if(!Array.isArray(rows)||rows.some(p=>!Number.isInteger(p.page)||typeof p.text!=='string'))throw Error('Invalid reading data');const map=new Map(rows.map(p=>[p.page,p.text]));s.pages.forEach(p=>p.text=map.get(p.page)??p.text);s.readingLoaded=true})}
 function message(url){return '<div class="source-load-state" role="status">'+(errors.has(url)?esc(errors.get(url))+' <button data-retry-reading="'+esc(url)+'">Retry loading</button>':'Loading the requested lecture material…')+'</div>'}
 const documentBefore=documentPanel;documentPanel=function(){const s=LEARNING.sources.find(s=>s.id===documentId);if(source(s)){if(!errors.has(s.readingURL))load(s);return message(s.readingURL)}return documentBefore()};
 const sourceBefore=sourceQuestionsPanel;sourceQuestionsPanel=function(){if(window.reviewCourseScope==='REN')return '<p>Browse the recalled Renal questions in the interactive booklet.</p><button data-view="booklet">Open Booklet</button>';if(LEARNING.sourceQuestionsURL&&!LEARNING.sourceQuestionsLoaded){if(!errors.has(LEARNING.sourceQuestionsURL))request(LEARNING.sourceQuestionsURL,rows=>{if(!Array.isArray(rows)||rows.some(q=>typeof q.id!=='string'||!Array.isArray(q.options)))throw Error('Invalid source question index');LEARNING.sourceQuestions=rows;LEARNING.sourceQuestionsLoaded=true});return message(LEARNING.sourceQuestionsURL)}return sourceBefore()};
 let searchIndex=null;
 const beforeSearch=searchPassages;searchPassages=function(){
  if(window.reviewCourseScope==='REN')return searchRenalDocuments();
  if(!LEARNING.searchIndexURL)return beforeSearch();
  if(!searchIndex){if(!errors.has(LEARNING.searchIndexURL))request(LEARNING.searchIndexURL,data=>{if(data.version!==1||!Array.isArray(data.pages)||!data.terms)throw Error('Invalid search index');searchIndex=data});return message(LEARNING.searchIndexURL)}
  const terms=(sourceSearch.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>1),scores=new Map();
  terms.forEach(term=>{const seen=new Set();for(const[word,rows]of Object.entries(searchIndex.terms))if(word.includes(term))for(const i of rows)seen.add(i);for(const i of seen)scores.set(i,(scores.get(i)||0)+1)});
  let results=[...scores].map(([i,score])=>({...searchIndex.pages[i],score,indexed:true}));
  for(const s of LEARNING.sources.concat(uploads.map(u=>({...u,pages:uploadBodies[u.id]?.pages||[]}))))if(!s.readingURL)for(const p of s.pages||[]){const text=p.text||'',score=terms.filter(t=>text.toLowerCase().normalize('NFKC').includes(t)).length;if(score){const start=Math.max(0,text.toLowerCase().indexOf(terms[0])-100);results.push({source:s.id,page:p.page,score,snippet:text.slice(start,start+650)})}}
  results=results.filter(r=>{const source=sourceById(r.source);return source&&librarySourceInCourse(source)&&libraryDocumentURL(source,r.page)});
  results.sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source)||a.page-b.page);
  return '<p class="muted">'+results.length+' matching pages · showing '+Math.min(30,results.length)+'. Search uses an index; full documents open directly.</p>'+results.slice(0,30).map(r=>{const s=sourceById(r.source);return '<article class="search-passage"><strong>'+esc(s?.displayName||s?.name||r.source)+' · '+(s?.unit==='slide'?'slide ':'PDF p')+r.page+'</strong><p>'+esc(r.snippet)+'</p>'+(r.indexed?'<small>Page preview · matched terms: '+esc(terms.join(', '))+'. Open the page for full context.</small>':'')+'<a href="'+esc(libraryDocumentURL(s,r.page))+'" target="_blank" rel="noopener noreferrer">Open full document ↗</a></article>'}).join('')||'<p>No matching pages. Try a shorter term.</p>'
 };
 const libraryBefore=library;library=function(){return window.reviewCourseScope?libraryBefore():libraryBefore().replace(/Source questions · \d+/, 'Source questions · '+(LEARNING.sourceQuestionCount??LEARNING.sourceQuestions.length))};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-retry-reading]');if(b){errors.delete(b.dataset.retryReading);render()}});
})();
