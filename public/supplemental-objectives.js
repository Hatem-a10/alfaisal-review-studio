'use strict';

function applySupplementalObjectives(learning, checks, pack, onAdded=()=>{}) {
 if (!Array.isArray(pack.questions) || pack.questions.some(q=>!q.id||!q.objectiveId||q.options?.length<4)) {
  throw Error('Could not read the supplemental question bank.');
 }
 const byId = new Map();
 for (const q of [...learning.questions,...Object.values(checks).flat()]) {
  if (!byId.has(q.id)) byId.set(q.id, new Set());
  byId.get(q.id).add(q);
 }
 for (const q of pack.questions) if (!byId.has(q.id)) {
  byId.set(q.id,new Set([q]));
  learning.questions.push(q);
  onAdded(q.id);
 }
 for (const [id,assignment] of Object.entries(pack.mappings || {})) {
  for (const q of byId.get(id) || []) {
   if (typeof assignment === 'string') q.objectiveId = assignment;
   else {
    const {lectureId,objectiveId} = assignment;
    if (!q.lectureIds.includes(lectureId)) q.lectureIds = [...q.lectureIds,lectureId];
    q.objectiveByLecture = {...q.objectiveByLecture,[lectureId]:objectiveId};
   }
  }
 }
 for (const [id,[option,reason]] of Object.entries(pack.append || {})) {
  for (const q of byId.get(id) || []) if (q.options.length===3) {
   q.options = [...q.options,option];
   q.reasons = [...q.reasons,reason];
   q.appendedOption = true;
  }
 }
}

function applyTopicTakeaways(teaching, points) {
 for (const guide of Object.values(teaching.guides)) {
  for (const section of guide.sections) {
   if (Object.hasOwn(points, section.id)) section.keyPoints = points[section.id];
  }
 }
}

(()=>{
 let request, ready = false, error = '', packs = null, cvpRequest, cvpReady = false;
 const appendedIds=new Set();
 // Course packs load on demand: apply only to loaded courses, and again whenever another course arrives.
 // Every step below is idempotent (keyed by id), so repeating it for earlier courses changes nothing.
 const loaded=id=>window.reviewCourseLoaded?.(String(id).split(/[-:]/)[0])??true;
 const pick=object=>Object.fromEntries(Object.entries(object).filter(([id])=>loaded(id)));
 function applyLoaded(){
  if(!packs)return;
  const {pack,expansion,takeaways,lab}=packs;
  applyLessonExpansion(LEARNING, TEACHING, TOPIC_CHECKS, pick(expansion));
  applyLessonExpansion(LEARNING, TEACHING, TOPIC_CHECKS, pick(lab));
  applySupplementalObjectives(LEARNING, TOPIC_CHECKS, {...pack,questions:pack.questions.filter(q=>(q.lectureIds||[]).every(loaded))},id=>appendedIds.add(id));
  if(cvpReady)restoreSupplementalOrder();
  applyTopicTakeaways(TEACHING, takeaways);
  inlineLessonCache.clear();
 }
 window.addEventListener?.('review-course-loaded',()=>{if(ready)applyLoaded()});
 // Only dynamically appended supplemental questions are reordered. Original bank and
 // course-pack entries retain their positions even when CVP is opened after MOL.
 function restoreSupplementalOrder(){
  const order=new Map(packs.pack.questions.map((q,i)=>[q.id,i]));
  const extras=LEARNING.questions.filter(q=>appendedIds.has(q.id));
  if(!extras.length)return;
  extras.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity));
  LEARNING.questions.splice(0,LEARNING.questions.length,...LEARNING.questions.filter(q=>!appendedIds.has(q.id)),...extras);
 }
 const views = new Set(['learning','practice','original-exams','wrong-bank']);
 const needsCvp=()=>window.REVIEW_STUDIO_FRESH_ACCOUNTS!==true||window.reviewViewingArchive?.()===true&&window.reviewArchiveEnabled?.()===true;
 const priorRender = render;
 const load=async path=>{
  const response=await fetch(path,{credentials:'same-origin'});
  if(!response.ok)throw Error('Could not load the lesson content.');
  return response.json();
 };
 const archivePaths=['/supplemental-objective-questions.json?v=3','/lesson-expansion-data.json?v=1','/topic-takeaways.json?v=1','/cvp-source-walkthroughs.json?v=2'];
 const activePaths=['/supplemental-objective-questions-active.json?v=1','/lesson-expansion-data-active.json?v=1','/topic-takeaways-active.json?v=1'];
 function ensureCvpMaterials(){
  if(!needsCvp()||cvpReady)return Promise.resolve();
  if(cvpRequest)return cvpRequest;
  cvpRequest=Promise.all(archivePaths.map(load)).then(([pack,expansion,takeaways,lab])=>{
   packs={pack,expansion,takeaways,lab};
   applyLoaded();
   cvpReady=true;
   restoreSupplementalOrder();
  }).catch(e=>{error='Could not load CVP archive study material. Check your connection and retry.';throw e})
   .finally(()=>{cvpRequest=null;if(views.has(view))render()});
  return cvpRequest;
 }
 window.ensureObjectivePack=function(){
  if(ready)return ensureCvpMaterials();
  if(request)return request.then(ensureCvpMaterials);
  error='';
  const includeCvp=needsCvp();
  request=Promise.all((includeCvp?archivePaths:activePaths).map(load))
   .then(([pack,expansion,takeaways,lab])=>{
    packs={pack,expansion,takeaways,lab:includeCvp?lab:{}};
    applyLoaded();
    ready=true;
    cvpReady=includeCvp;
   })
   .catch(e=>{error='Could not load the question bank. Check your connection and retry.';throw e})
   .finally(()=>{request=null;if(views.has(view))render()});
  return request.then(ensureCvpMaterials);
 };
 render=function(){
  if(!views.has(view)||ready&&(!needsCvp()||cvpReady))return priorRender();
  const content=document.getElementById('content');
  if(error){content.innerHTML='<div class="panel notice" role="status">'+esc(error)+' <button id="retryObjectivePack">Retry</button></div>';return}
  content.innerHTML='<div class="panel notice" role="status">Loading your question bank…</div>';
  window.ensureObjectivePack().catch(()=>{});
 };
 document.addEventListener('click',event=>{
  if (event.target.closest('#retryObjectivePack')) { error='';render(); }
 });
})();
