'use strict';
(()=>{
 function priorities(){const c=assessmentClock();return AssessmentPlan.nextByCourse(DATA.events,DATA.items,c.date,c.minute)}
 lessonCourse='today';
 let catalogExpanded=false;
 globalThis.document?.addEventListener?.('click',event=>{
  const toggle=event.target.closest('#lessonCatalogToggle');
  if(toggle){
   catalogExpanded=!catalogExpanded;
   toggle.setAttribute('aria-expanded',String(catalogExpanded));
   toggle.closest('.lesson-catalog').dataset.expanded=String(catalogExpanded);
  }else if(event.target.closest('.lesson-catalog [data-lesson]'))catalogExpanded=false;
 },true);
 const daysLeft=a=>Study.gap(a.date,today());
 lessonCatalog=function(){
  const groups=priorities();if(lessonCourse.startsWith('priority:')&&!groups.some(a=>a.course===lessonCourse.slice(9)))lessonCourse=lessonCourse.slice(9);const priority=lessonCourse.startsWith('priority:')?lessonCourse.slice(9):null,active=groups.find(a=>a.course===priority);
  const date=today(),savedTasks=tasks().filter(t=>!t.done&&t.date<=date&&!(t.p===2&&state[t.x.id]?.skipThird)&&!learningStatus(t.x.id).passed),todayIds=new Set(HubDomain.lessonIdsForDay(savedTasks,date)),overdueIds=new Set(HubDomain.lessonIdsForDay(savedTasks,date,true));
  const scope=globalThis.reviewCourseScope;
  const matches=(value,x)=>{if(globalThis.reviewLessonVisible?.(x.id)===false||x.course==='REN'&&!globalThis.reviewCvpArchived?.()||scope&&x.course!==scope)return false;const p=value.startsWith('priority:')?groups.find(a=>a.course===value.slice(9)):null;return (value==='today'?todayIds.has(x.id):value==='overdue'?overdueIds.has(x.id):value==='all'?true:p?p.lectureIds.includes(x.id):x.course===value)&&(!lessonSearch||(title(x)+' '+x.code).toLowerCase().includes(lessonSearch.toLowerCase()))};
  const all=DATA.items.filter(x=>matches(lessonCourse,x)&&(!globalThis.reviewCvpArchived?.()||scope==='CVP'||x.course!=='CVP'));
  const option=(value,label)=>{const count=DATA.items.filter(x=>matches(value,x)).length;return `<option value="${esc(value)}" ${lessonCourse===value?'selected':''}>${esc(label)} · ${count}</option>`};
  const renalOption=globalThis.reviewCvpArchived?.()?option('REN','REN 123'):'';
  const menu=renalOption+option('today','Today’s lessons')+option('overdue','Overdue lessons')+option('all','All courses')+['MOL','CVP'].filter(c=>c!=='CVP'||!globalThis.reviewCvpArchived?.()).map(c=>{const a=groups.find(a=>a.course===c);return `<optgroup label="${c} ${c==='CVP'?'112':'114'}">${option(c,'All '+c+' lessons')}${a?option('priority:'+c,a.label+' · '+(daysLeft(a)===0?'Today':daysLeft(a)+' days')):''}</optgroup>`}).join('');
  const note=active?`<p class="priority-scope-note">${esc(active.scopeKind==='suggested'?active.scopeNote:'Coverage from your supplied assessment guide.')} ${esc(fmt(active.date))}</p>`:'';
  const list=(all.map(x=>{const s=learningStatus(x.id),concepts=globalThis.lessonConceptCount?.(x.id)||0;return `<button data-lesson="${esc(x.id)}" aria-current="${x.id===lessonId}" class="${x.id===lessonId?'chosen':''} ${s.passed?'lesson-mastered':''}"><span>${esc(x.course==='CVP'?'CVP '+x.code:x.code)}</span><strong>${esc(title(x))}</strong>${x.course==='REN'&&typeof guideFor==='function'&&guideFor(x.id)?.underDevelopment?'<span class="coverage-development">Under development</span>':provisionalGuide(x.id)?'<span class="coverage-provisional">Provisional coverage</span>':''}<small>${s.pending?s.label:s.passed?'✓ MCQ target reached':concepts?concepts+' concepts · '+s.known+'/'+s.total+' topics stable':s.known+'/'+s.total+' concepts stable'}</small></button>`}).join(''))||`<p class="muted">${lessonCourse==='today'?'No unfinished lessons for today. Choose All courses to browse.':lessonCourse==='overdue'?'No overdue lessons.':'No matching lessons.'}</p>`;
  return `<aside class="lesson-catalog" data-expanded="${catalogExpanded}"><button type="button" id="lessonCatalogToggle" aria-expanded="${catalogExpanded}" aria-controls="lessonCatalogControls">Browse lessons <span aria-hidden="true">⌄</span></button><div id="lessonCatalogControls"><div class="catalog-head"><h3>Your lessons</h3><input id="lessonSearch" type="search" value="${esc(lessonSearch)}" placeholder="Search a lesson…" aria-label="Search lessons"><select id="lessonCourse" aria-label="Lesson course">${scope?option(scope,scope==='CVP'?'CVP archive':'MOL 114'):menu}</select>${note}</div><div class="catalog-list" tabindex="0" role="region" aria-label="Lesson list">${list}</div></div></aside>`;
 };
 const beforeCatalogRender=render;
 render=function(...args){
  const list=view==='learning'&&document.querySelector('#lessonCatalogControls .catalog-list');
  const top=list?.scrollTop||0,course=document.getElementById('lessonCourse')?.value;
  const result=beforeCatalogRender.apply(this,args);
  if(top&&view==='learning'&&course===document.getElementById('lessonCourse')?.value){
   const next=document.querySelector('#lessonCatalogControls .catalog-list');
   if(next&&next!==list)next.scrollTop=top;
  }
  return result;
 };
 let previous=JSON.stringify(priorities().map(a=>a.id));setInterval(()=>{const current=JSON.stringify(priorities().map(a=>a.id));if(current!==previous){previous=current;if(view==='learning'||view==='dashboard')render()}},60000);
 render();
})();
