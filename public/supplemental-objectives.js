'use strict';
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
  request ??= fetch('/supplemental-objective-questions.json?v=1', {credentials:'same-origin'})
   .then(response=>{
    if (!response.ok) throw Error('Could not load the supplemental question bank.');
    return response.json();
   })
   .then(questions=>{
    if (!Array.isArray(questions) || questions.some(q=>!q.id||!q.objectiveId||q.options?.length<4)) {
     throw Error('Could not read the supplemental question bank.');
    }
    const seen = new Set(LEARNING.questions.map(q=>q.id));
    for (const q of questions) if (!seen.has(q.id)) {
     seen.add(q.id);
     LEARNING.questions.push(q);
    }
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
