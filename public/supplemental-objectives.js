'use strict';

function applySupplementalObjectives(learning, checks, pack) {
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
 // Course packs load on demand: apply only to loaded courses, and again whenever another course arrives.
 // Every step below is idempotent (keyed by id), so repeating it for earlier courses changes nothing.
 const loaded=id=>window.reviewCourseLoaded?.(String(id).split(/[-:]/)[0])??true;
 const pick=object=>Object.fromEntries(Object.entries(object).filter(([id])=>loaded(id)));
 function applyLoaded(){
  if(!packs)return;
  const {pack,expansion,takeaways,lab}=packs;
  applyLessonExpansion(LEARNING, TEACHING, TOPIC_CHECKS, pick(expansion));
  applyLessonExpansion(LEARNING, TEACHING, TOPIC_CHECKS, pick(lab));
  applySupplementalObjectives(LEARNING, TOPIC_CHECKS, {...pack,questions:pack.questions.filter(q=>(q.lectureIds||[]).every(loaded))});
  applyTopicTakeaways(TEACHING, takeaways);
  inlineLessonCache.clear();
 }
 window.addEventListener?.('review-course-loaded',()=>{if(ready)applyLoaded()});
 const views = new Set(['learning','practice','original-exams','wrong-bank']);
 const needsCvp=()=>window.REVIEW_STUDIO_FRESH_ACCOUNTS!==true||window.reviewViewingArchive?.()===true&&window.reviewArchiveEnabled?.()===true;
 const priorRender = render;
 const load=async path=>{
  const response=await fetch(path,{credentials:'same-origin'});
  if(!response.ok)throw Error('Could not load the lesson content.');
  return response.json();
 };
 function ensureCvpWalkthrough(){
  if(!needsCvp()||cvpReady)return Promise.resolve();
  if(cvpRequest)return cvpRequest;
  cvpRequest=load('/cvp-source-walkthroughs.json?v=2').then(lab=>{
   packs.lab=lab;
   applyLoaded();
   cvpReady=true;
  }).catch(e=>{error='Could not load CVP archive walkthroughs. Check your connection and retry.';throw e})
   .finally(()=>{cvpRequest=null;if(views.has(view))render()});
  return cvpRequest;
 }
 window.ensureObjectivePack=function(){
  if(ready)return ensureCvpWalkthrough();
  if(request)return request.then(ensureCvpWalkthrough);
  error='';
  request=Promise.all([load('/supplemental-objective-questions.json?v=3'),load('/lesson-expansion-data.json?v=1'),load('/topic-takeaways.json?v=1')])
   .then(([pack,expansion,takeaways])=>{
    packs={pack,expansion,takeaways,lab:{}};
    applyLoaded();
    ready=true;
   })
   .catch(e=>{error='Could not load the question bank. Check your connection and retry.';throw e})
   .finally(()=>{request=null;if(views.has(view))render()});
  return request.then(ensureCvpWalkthrough);
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
