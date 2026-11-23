'use strict';
(()=>{
 function priorities(){const c=assessmentClock();return AssessmentPlan.nextByCourse(DATA.events,DATA.items,c.date,c.minute)}
 lessonCourse='today';
 const daysLeft=a=>Study.gap(a.date,today());
 lessonCatalog=function(){
  const groups=priorities();if(lessonCourse.startsWith('priority:')&&!groups.some(a=>a.course===lessonCourse.slice(9)))lessonCourse=lessonCourse.slice(9);const priority=lessonCourse.startsWith('priority:')?lessonCourse.slice(9):null,active=groups.find(a=>a.course===priority);
  const date=today(),savedTasks=tasks().filter(t=>!t.done&&t.date<=date&&!(t.p===2&&state[t.x.id]?.skipThird)&&!learningStatus(t.x.id).passed),todayIds=new Set(HubDomain.lessonIdsForDay(savedTasks,date)),overdueIds=new Set(HubDomain.lessonIdsForDay(savedTasks,date,true));
  const scope=globalThis.reviewCourseScope;
  const matches=(value,x)=>{if(x.course==='REN'&&!globalThis.reviewCvpArchived?.()||scope&&x.course!==scope)return false;const p=value.startsWith('priority:')?groups.find(a=>a.course===value.slice(9)):null;return (value==='today'?todayIds.has(x.id):value==='overdue'?overdueIds.has(x.id):value==='all'?true:p?p.lectureIds.includes(x.id):x.course===value)&&(!lessonSearch||(title(x)+' '+x.code).toLowerCase().includes(lessonSearch.toLowerCase()))};
  const all=DATA.items.filter(x=>matches(lessonCourse,x)&&(!globalThis.reviewCvpArchived?.()||scope==='CVP'||x.course!=='CVP'));
  const availableRenal=scope!=='CVP'?globalThis.reviewRenalCatalog?.()||[]:[];
  const renal=availableRenal.filter(x=>!lessonSearch||(x.code+' '+x.title).toLowerCase().includes(lessonSearch.toLowerCase()));
  const option=(value,label)=>{const count=DATA.items.filter(x=>matches(value,x)).length;return `<option value="${esc(value)}" ${lessonCourse===value?'selected':''}>${esc(label)} · ${count}</option>`};
  const renalOption=globalThis.reviewCvpArchived?.()?'<option value="REN" '+(lessonCourse==='REN'?'selected':'')+'>REN 123 · '+(renal.length+DATA.items.filter(x=>matches('REN',x)).length)+'</option>':'';
  const menu=renalOption+option('today','Today’s lessons')+option('overdue','Overdue lessons')+option('all','All courses')+['MOL','CVP'].filter(c=>c!=='CVP'||!globalThis.reviewCvpArchived?.()).map(c=>{const a=groups.find(a=>a.course===c);return `<optgroup label="${c} ${c==='CVP'?'112':'114'}">${option(c,'All '+c+' lessons')}${a?option('priority:'+c,a.label+' · '+(daysLeft(a)===0?'Today':daysLeft(a)+' days')):''}</optgroup>`}).join('');
  const note=active?`<p class="priority-scope-note">${esc(active.scopeKind==='suggested'?active.scopeNote:'Coverage from your supplied assessment guide.')} ${esc(fmt(active.date))}</p>`:'';
  const renalRows=['REN','all'].includes(lessonCourse)?renal.map(x=>'<button type="button" data-renal-lesson="'+esc(x.id)+'" class="'+(x.chosen?'chosen':'')+'"><span>'+esc(x.code)+'</span><strong>'+esc(x.title)+'</strong><small>'+'Source pending'+'</small></button>').join(''):'';
  const list=(renalRows+all.map(x=>{const s=learningStatus(x.id);return `<button data-lesson="${esc(x.id)}" class="${x.id===lessonId?'chosen':''} ${s.passed?'lesson-mastered':''}"><span>${esc(x.course==='CVP'?'CVP '+x.code:x.code)}</span><strong>${esc(title(x))}</strong>${provisionalGuide(x.id)?'<span class="coverage-provisional">Provisional coverage</span>':''}<small>${s.passed?'✓ MCQ target reached':s.known+'/'+s.total+' concepts stable'}</small></button>`}).join(''))||`<p class="muted">${lessonCourse==='today'?'No unfinished lessons for today. Choose All courses to browse.':lessonCourse==='overdue'?'No overdue lessons.':'No matching lessons.'}</p>`;
  return `<aside class="lesson-catalog"><div class="catalog-head"><h3>Your lessons</h3><input id="lessonSearch" type="search" value="${esc(lessonSearch)}" placeholder="Search a lesson…" aria-label="Search lessons"><select id="lessonCourse" aria-label="Lesson course">${scope?option(scope,scope==='CVP'?'CVP archive':'MOL 114'):menu}</select>${note}</div><div class="catalog-list">${list}</div></aside>`;
 };
 let previous=JSON.stringify(priorities().map(a=>a.id));setInterval(()=>{const current=JSON.stringify(priorities().map(a=>a.id));if(current!==previous){previous=current;if(view==='learning'||view==='dashboard')render()}},60000);
 render();
})();
