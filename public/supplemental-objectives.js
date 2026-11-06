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

(()=>{
 let request, ready = false, error = '';
 const views = new Set(['learning','practice','original-exams','wrong-bank']);
 const priorRender = render;
 render = function() {
  if (!views.has(view) || ready) return priorRender();
  const content = document.getElementById('content');
  if (error) {
   content.innerHTML = '<div class="panel notice" role="status">'+esc(error)+' <button id="retryObjectivePack">Retry</button></div>';
   return;
  }
  content.innerHTML = '<div class="panel notice" role="status">Loading your question bank…</div>';
  request ??= fetch('/supplemental-objective-questions.json?v=3', {credentials:'same-origin'})
   .then(response=>{
    if (!response.ok) throw Error('Could not load the supplemental question bank.');
    return response.json();
   })
   .then(pack=>{
    applySupplementalObjectives(LEARNING, TOPIC_CHECKS, pack);
    inlineLessonCache.clear();
    ready = true;
   })
   .catch(()=>{error='Could not load the question bank. Check your connection and retry.'})
   .finally(()=>{request=null;render()});
 };
 document.addEventListener('click',event=>{
  if (event.target.closest('#retryObjectivePack')) { error='';render(); }
 });
})();
