'use strict';

function libraryDocumentURL(source, page = 1, lookup) {
 if (!source) return null;
 const target = sourceTarget({source: source.id, page},lookup);
 if (!target || !/^(?:\/api\/(?:materials|study-assets)\/[\w-]+(?:[?#]|$)|\/(?:api\/site-assets\/)?(?:materials|study_material)\/|https:\/\/)/.test(target.url)) return null;
 if (!/\.(?:pdf|pptx?|docx|txt)(?:$|[?#])/i.test(target.url) && !/\.(?:pdf|pptx?|docx|txt)(?:$|[?#])/i.test(source.name)) return null;
 return sourcePageURL(target);
}

function suppliedLectureForFile(name) {
 const file = name.replace(/ \(\d+\)(?=\.[^.]+$)/, '');
 return {
  'A6 - Blood_Supply_of_the_Heart_2026-27_Dr. Akef.pdf': 'CVP-A6',
  'A7 - Blood Vessel Histology 2026 Fall Dr Ani.pptx': 'CVP-A7',
  'A8 - Thoracic Wall - Dr. Olena.pdf': 'CVP-A8',
  'P6 - Dr Moni Nader 11102026.pptx': 'CVP-P6',
  'P11 - Cardiac output Venous return and their regulation- Dr Moni Nader- 18102026.pptx': 'CVP-P11',
  'P14 - Cardiac Failure- Dr Moni Nader-21102026.pptx': 'CVP-P14',
  'Thoracic Wall - Dr. Olena.pdf': 'CVP-A8',
  'Lecture 2 Blood Vessel Histology 2026 Fall Dr Ani.pptx': 'CVP-A7',
  'A7. Blood Vessel Histology Transcription.pdf': 'CVP-A7',
  'Heart valves and heart sounds - Dr Moni Nader-15102026.pptx': 'CVP-P10',
  'Hemodynamics II- Vascular distensibility and function of blood - Dr. Nader.pptx': 'CVP-P9',
  'Hemodynamics I - Overview of the circulation Dr Moni Nader.pptx': 'CVP-P8',
  'Cardiac Cycle- Dr Moni Nader.pptx': 'CVP-P6',
  "Mediastinum - Dr Olena.pdf": "CVP-A11",
  "Lecture 3 Microcirculation Histology 2026 Fall Dr Ani.pptx": "CVP-A10",
  "ANATOMY OF THE NOSE, LARYNX AND TRACHEA.pptx": "CVP-A12",
  "Histology of respiratory tract 1_Dr. Einas-compressed.pdf": "CVP-A13",
  "A10. Lecture 3 Microcirculation Histology 2026 Fall Dr Ani.pdf": "CVP-A10",
  "A11 Mediastinum transcription.pdf": "CVP-A11",
  "A12. Anatomy of the Nose, Larynx, & Trachea Transcription - Haadiya Zeeshan.pdf": "CVP-A12",
  "A13_Histology_of_the_Upper_Respiratory_Tract_Transcription.pdf": "CVP-A13",
  "Embryology of Heart 2-aortic arch.pptx": "CVP-A14",
  "Intercostal Space, Diaphragm - Dr. Olena.pdf": "CVP-A15",
  "Lungs Anatomy - Dr. Olena.pdf": "CVP-A16",
  "Histology of respiratory tract 2_Dr. Einas-compressed.pdf": "CVP-A17",
  "A14. Aortic Arch Transcription by Wasan Binsadiq.pdf": "CVP-A14",
  "A15. Intercostal Space, Diaphragm - Dr. Olena - by Merehan Soliman.pdf": "CVP-A15",
  "A16 Lungs Anatomy Transcription - Haadiya Zeeshan.pdf": "CVP-A16",
  "A17_Histology of the Lower Respiratory Tract_Transcription (1)-1.pdf": "CVP-A17",
 }[file];
}

function libraryMaterials(item, lesson, sources) {
 const refs = lesson?.references || [];
 const coverage = lesson?.coverage;
 const selections = {slides: [], transcript: []};
 for (const source of sources) {
  const id = source.id;
  if (/not verified lecturer transcript/i.test(source.kind || '')) continue;
  const category = /transcri|\btranscript\b/i.test(source.kind || '') || /^cvp-t-|^cvp-transcript$/.test(id) ? 'transcript'
   : /slide|(?:supplied|original) lecture$/i.test(source.kind || '') && !/notes|quiz|syllabus/i.test(source.kind || '') || /^cvp-w3-/.test(id) ? 'slides'
   : source.lectureId === item.id ? (/transcri|transcript|^A7\. Blood Vessel Histology\.pdf$|^P10\. Heart sounds\.pdf$|^A10\. Lecture 3 Microcirculation Histology|^A15\. Intercostal Space, Diaphragm - Dr\. Olena - by Merehan Soliman/i.test(source.name) ? 'transcript' : /slides|presentation|\.pptx?$/i.test(source.name) || suppliedLectureForFile(source.name) === item.id ? 'slides' : null) : null;
  if (!category || (source.lectureIds?.length && !source.lectureIds.includes(item.id))) continue;
  const reference = refs.find(ref => ref.source === id);
  const range = Array.isArray(source.lectureRanges) && source.lectureRanges.find(entry => entry.lectureId === item.id);
  const matchingCoverage = category === 'slides' ? coverage?.slideSources?.some(entry => entry.source === id) : coverage?.transcriptSource === id;
  if (!reference && !range && !matchingCoverage && !source.lectureIds?.includes(item.id) && source.lectureId !== item.id) continue;
  const sharedStart = {
   'new-embryology:CVP-A20': 26,
   'depth-t-5:CVP-P19': 19,
   'new-p2324:CVP-P24': 17,
   'cvp-pulm-t-p20:CVP-P21': 20,
  }[id + ':' + item.id];
  selections[category].push({source, page: sharedStart || range?.start || (id.startsWith('depth-t-') ? 1 : reference?.page) || 1,
   rank: Number(id === 'depth-t-6' && item.id === 'CVP-P18') * 6 + Number(!!matchingCoverage) * 4 + Number(!!source.lectureIds?.includes(item.id)) * 2 + Number(!!source.url && source.url !== '#library')});
 }
 for (const list of Object.values(selections)) list.sort((a,b) => b.rank - a.rank);
 return selections;
}

function librarySourceInCourse(source, scope=globalThis.reviewCourseScope, references) {
  if(!scope)return !globalThis.reviewArchivedStudyItem?.(source);
  if(source.course)return source.course===scope;
  const ranges=Array.isArray(source.lectureRanges)?source.lectureRanges:[];
  const mapped=[source.lectureId,...(source.lectureIds||[]),...ranges.map(range=>range.lectureId)].filter(Boolean);
  if(mapped.length)return mapped.some(id=>id.startsWith(scope+'-'));
  if(references ? references().has(source.id) : LEARNING.lessons.some(lesson=>lesson.id.startsWith(scope+'-')&&lesson.references?.some(ref=>ref.source===source.id)))return true;
  return new RegExp('(?:^|[^a-z])'+scope+'(?:[^a-z]|$)','i').test(source.id+' '+source.name);
}

// Validate the complete manifest before touching the live source array.
function renalManifestSources(rows, sources) {
 if(!Array.isArray(rows))throw Error('Invalid Renal document index.');
 const ids=new Set(),paths=new Set(),existingIds=new Set(sources.map(s=>s.id)),existingURLs=new Set(sources.map(s=>s.url)),added=[];
 for(const row of rows){
  if(!row||typeof row.id!=='string'||!/^[a-z0-9][a-z0-9-]*$/i.test(row.id)||typeof row.title!=='string'||!row.title.trim()||typeof row.path!=='string'||!/^materials\/ren123\/[a-z0-9][a-z0-9._-]*\.(?:pdf|pptx?|docx|txt)$/i.test(row.path)||!['lecture','lab','overview','booklet'].includes(row.kind)||!Array.isArray(row.sessions)||row.sessions.some(code=>typeof code!=='string'||!/^[A-Z]+\d+$/.test(code)))throw Error('Invalid Renal document entry.');
  if(ids.has(row.id)||paths.has(row.path))throw Error('Duplicate Renal document entry.');
  ids.add(row.id);paths.add(row.path);
  const id='ren123-'+row.id,url='/api/site-assets/'+row.path;
  // Existing canonical course sources take precedence. Never create a second source with the same identity.
  if(existingURLs.has(url)||existingIds.has(id))continue;
  const file=row.path.split('/').at(-1),lectureIds=[...new Set(row.sessions)].map(code=>'REN-'+code);
  added.push({id,name:file,displayName:row.title,course:'REN',kind:/\.txt$/i.test(file)?'Lecture transcript':row.kind==='lecture'&&lectureIds.length?'Original lecture':row.kind,lectureIds,unit:/\.pptx?$/i.test(file)?'slide':'page',url,pages:[]});
 }
 return added;
}
let renalLibraryRequest, renalLibraryReady=false, renalLibraryError=false;
function loadRenalLibrary() {
 if(renalLibraryReady||renalLibraryRequest)return;
 renalLibraryError=false;
 const controller=typeof AbortController==='function'?new AbortController():null,timeout=controller?setTimeout(()=>controller.abort(),15000):null;
 renalLibraryRequest=fetch('/renal-materials.json',controller?{signal:controller.signal}:undefined).then(response=>{
  if(!response.ok)throw Error('Could not load Renal documents.');
  return response.json();
 }).then(rows=>{
  const added=renalManifestSources(rows,LEARNING.sources);
  LEARNING.sources.push(...added);
  renalLibraryReady=true;
 }).catch(()=>renalLibraryError=true).finally(()=>{
  if(timeout!==null)clearTimeout(timeout);
  renalLibraryRequest=null;
  if(view==='library'&&globalThis.reviewCourseScope==='REN')render();
 });
}
// A snapshot is owned by one synchronous list render, never retained across account or catalog changes.
function libraryLookup(scope=globalThis.reviewCourseScope) {
 const sources=LEARNING.sources.concat(uploads),byId=new Map();let referenceIds;
 for(const source of sources)if(!byId.has(source.id))byId.set(source.id,source);
 return {scope,sources,lookup:id=>byId.get(id),references:()=>{if(!referenceIds){referenceIds=new Set();for(const lesson of LEARNING.lessons)if(lesson.id.startsWith(scope+'-'))for(const ref of lesson.references||[])referenceIds.add(ref.source)}return referenceIds}};
}
function libraryDocuments(snapshot=libraryLookup()) {
 return snapshot.sources.filter(source=>librarySourceInCourse(source,snapshot.scope,snapshot.references)&&libraryDocumentURL(source,1,snapshot.lookup));
}

// Index only associations that libraryMaterials already requires; build once per list render.
// IDs can be duplicated in the source catalog, so keep source indices and canonical order.
function libraryLectureCandidates(sources,items,lookup=lessonById){
 const ids=new Map(),positions=new Map();
 const add=(lecture,index)=>{if(typeof lecture!=='string'||!lecture)return;let set=positions.get(lecture);if(!set){set=new Set();positions.set(lecture,set)}set.add(index)};
 sources.forEach((source,index)=>{
  if(!ids.has(source.id))ids.set(source.id,[]);
  ids.get(source.id).push(index);
  add(source.lectureId,index);
  if(Array.isArray(source.lectureIds))for(const id of source.lectureIds)add(id,index);
  else if(typeof source.lectureIds==='string')for(const item of items)if(source.lectureIds.includes(item.id))add(item.id,index);
  for(const range of Array.isArray(source.lectureRanges)?source.lectureRanges:[])add(range?.lectureId,index);
 });
 for(const item of items){
  const lesson=lookup(item.id),coverage=lesson?.coverage;
  const references=[...(lesson?.references||[]),...(coverage?.slideSources||[])];
  if(coverage?.transcriptSource)references.push({source:coverage.transcriptSource});
  for(const ref of references)for(const index of ids.get(ref?.source)||[])add(item.id,index);
 }
 return new Map([...positions].map(([id,indexes])=>[id,[...indexes].sort((a,b)=>a-b).map(i=>sources[i])]));
}

function searchRenalDocuments() {
 const terms=sourceSearch.toLowerCase().split(/\s+/).filter(Boolean);
 const snapshot=libraryLookup(),matches=libraryDocuments(snapshot).filter(source=>{
  const name=(source.name+' '+(source.displayName||'')).toLowerCase();
  return terms.every(term=>name.includes(term));
 });
 if(!matches.length)return '<p>No matching document titles.</p>';
 return '<h3>Matching document titles</h3><ul class="material-extras">'+matches.map(source=>
  '<li><a href="'+esc(libraryDocumentURL(source,1,snapshot.lookup))+'" target="_blank" rel="noopener noreferrer">'+
  esc(source.displayName||source.name)+' ↗</a></li>').join('')+'</ul>';
}

function libraryLectureLists() {
 const scope=globalThis.reviewCourseScope;
 const snapshot=libraryLookup(scope),sources=libraryDocuments(snapshot);
 const candidates=libraryLectureCandidates(sources,DATA.items),covered=new Set();
 const disciplines=[
  ['CVP-A','Anatomy & Histology','anatomy'],['CVP-P','Physiology','physiology'],
  ['MOL-','Molecular Medicine','molecular'],['REN-A','Anatomy & Histology','anatomy'],['REN-P','Physiology','physiology']
 ];
 const groups=disciplines.filter(([prefix])=>scope?prefix.startsWith(scope+'-'):!prefix.startsWith('REN-')&&(!prefix.startsWith('CVP-')||!globalThis.reviewCvpArchived?.()));
 const lectureGroups=groups.map(([prefix,label,discipline])=>{
  const rows=DATA.items.filter(item=>item.id.startsWith(prefix)).sort((a,b)=>Number(a.id.slice(prefix.length))-Number(b.id.slice(prefix.length)));
  const links=(list,label)=>{
   if(!list.length)return '';
   const link=({source,page},caption)=>{
    covered.add(source.id);
    return `<a class="material-action" href="${esc(libraryDocumentURL(source,page,snapshot.lookup))}" target="_blank" rel="noopener noreferrer" title="${esc(source.name)}">${esc(caption)} ↗</a>`;
   };
   return '<div>'+link(list[0],label)+(list.length>1?`<details class="material-alternates"><summary>More ${label.toLowerCase()} (${list.length-1})</summary>${list.slice(1).map(entry=>link(entry,entry.source.displayName||entry.source.name)).join('')}</details>`:'')+'</div>';
  };
  const lectures=rows.map(item=>{
   const documents=libraryMaterials(item,lessonById(item.id),candidates.get(item.id)||[]);
   if(!documents.slides.length&&!documents.transcript.length)return '';
   return `<li><span class="document-lecture-code">${esc(item.id.replace('-',' '))}</span><strong>${esc(title(item))}</strong>
    <div class="material-actions">${links(documents.slides,'Slides')}${links(documents.transcript,'Transcription')}</div></li>`;
  }).filter(Boolean);
  if(!lectures.length)return '';
  return `<section class="document-discipline" data-discipline="${discipline}"><div class="document-discipline-heading"><h3>${esc(label)}</h3><span>${lectures.length} lectures</span></div><ol>${lectures.join('')}</ol></section>`;
 }).join('');

 const links={batch:[],course:[],external:[]};
 const seen=new Set();
 for(const source of sources){
  if(covered.has(source.id))continue;
  const url=libraryDocumentURL(source,1,snapshot.lookup),label=source.displayName||source.name;
  if(seen.has(url))continue;
  seen.add(url);
  const metadata=source.kind+' '+label;
  const category=/\b(?:batch|booklet|recalled|past[ -](?:paper|exam|question)s?)\b/i.test(metadata)?'batch'
   :/^https:\/\//.test(url)||/\btextbook\b/i.test(metadata)?'external':'course';
  links[category].push({url,label});
 }
 for(const reference of LEARNING.references||[]){
  if(!/^https?:\/\//.test(reference.url||'')||seen.has(reference.url))continue;
  links.external.push({url:reference.url,label:reference.title});
  seen.add(reference.url);
 }
 const otherSections=[['batch','Batch resources'],['course','Course handouts'],['external','Textbooks & external resources']];
 const shared=globalThis.REVIEW_STUDIO_FRESH_ACCOUNTS===true&&globalThis.reviewManagedFlags?.resourceLibrary!==false;
 const sections=otherSections.filter(([id])=>links[id].length||id==='batch'&&shared);
 const nav=[...(lectureGroups?[['lectures','Lectures']]:[]),...sections].map(([id,label])=>`<button type="button" data-document-jump="${id}">${label}</button>`).join('');
 const status=scope==='REN'&&!renalLibraryReady?renalLibraryError
  ? '<p role="status">Could not load additional Renal documents. <button data-retry-renal-library>Retry</button></p>'
  : '<p role="status">Loading course documents…</p>':'';
 return `${nav?`<nav class="document-library-index" aria-label="Document sections">${nav}</nav>`:''}
  ${status}
  ${lectureGroups?`<section class="document-library-section" id="documents-lectures"><h2>Lectures</h2>${lectureGroups}</section>`:''}
  ${sections.map(([id,label])=>`<section class="document-library-section" id="documents-${id}"><h2>${label}</h2>${id==='batch'&&shared?'<button type="button" id="openManagedResources">Browse shared documents</button>':''}
    ${links[id].length?`<ul class="document-link-list">${links[id].map(row=>`<li><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">${esc(row.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`:''}</section>`).join('')}
  ${!nav&&!status?'<p>No documents are available for this course yet.</p>':''}`;
}
