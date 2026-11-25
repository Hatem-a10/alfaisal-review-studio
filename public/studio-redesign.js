'use strict';
/* Presentation and navigation only: saved study data remains in the existing stores. */
(()=>{
 const nav=document.querySelector('#mainSidebar nav'), extras=document.querySelector('#navExtras'), extraItems=extras?.querySelector('div');
 if(nav&&extras&&extraItems){
  const overview=extraItems.querySelector('[data-view="dashboard"]');
  if(overview)nav.insertBefore(overview,nav.firstChild);
  const previous=nav.querySelector('[data-original-mode]');if(previous)extraItems.insertBefore(previous,extraItems.firstChild);
  const library=extraItems.querySelector('[data-view="library"]');if(library)nav.insertBefore(library,extras);
  const studyhub=nav.querySelector('[data-view="studyhub"]');if(studyhub)extraItems.insertBefore(studyhub,extraItems.firstChild);
  const summary=extras.querySelector('summary span');if(summary)summary.textContent='More tools';
 }
 window.reviewStainFor=event=>({exams:1,tbls:7,ospe:6,starts:5,other:4})[HubDomain.countdownCategory(event||{})];
 window.reviewNextStain=()=>{try{const c=assessmentClock(),event=nextAssessment(DATA.events,c.date);return event?window.reviewStainFor(event):0}catch{return 0}};
 window.reviewAssessmentGradientStyle=event=>window.reviewGradientStyleFor?.(event?window.reviewStainFor(event):0)||'';
 function assessmentStyle(event){const index=event?window.reviewStainFor(event):0;return {theme:index,icon:['✳','◈','✦','◉','✺','◇','✷','⌁'][index]};}
 function homeDaySchedule(){const events=campusWeekEvents(campusWeekStart(day),false).filter(e=>e.date===day&&!/prayer|lunch/i.test(e.title||'')).sort((a,b)=>a.start-b.start);const guides=DATA.events.filter(e=>e.date===day&&e.type==='MOL assessment guide'&&!events.some(x=>/MOL/i.test(x.title)&&(/TBL/i.test(x.title)===/TBL/i.test(e.title))));const rows=events.map(e=>`<button class="home-agenda-row" data-campus-event="${esc(e.id)}"><span class="home-agenda-time">${esc(campusTime(e.start))}</span><span class="agenda-dot campus-${esc(e.kind)}"></span><span class="home-agenda-copy"><strong>${esc(campusEventTitle(e).title)}</strong><small>${esc(campusEventTitle(e).detail||campusCategoryLabel(e.kind))}</small></span></button>`).join('')+guides.map(e=>`<div class="home-agenda-row home-guide-event"><span class="home-agenda-time">${esc((e.detail||'').match(/\d{2}:\d{2}–\d{2}:\d{2}/)?.[0]||'Time not listed')}</span><span class="agenda-dot campus-assessment"></span><span class="home-agenda-copy"><strong>${esc(e.title)}</strong><small>${esc(e.detail||'Assessment guide')}</small></span></div>`).join('');return `<section class="home-insights-card home-agenda"><div class="home-agenda-heading"><h2>Today’s schedule</h2><span>${esc(fmt(day))}</span></div><div class="home-agenda-list">${rows||'<p class="home-agenda-empty">No classes or events listed for this day.</p>'}</div><button class="home-text-link" data-view="calendar">Full schedule</button></section>`}
 // Active courses for progress: open (not closed after their final) and not archived.
 function homeCourses(){const items=DATA.items||[],seen=[...new Set(items.map(x=>x.course).filter(Boolean))];return seen.filter(c=>!window.reviewCourseClosed?.(c)&&!window.reviewArchivedStudyItem?.({course:c})&&(!window.reviewCourseConfig?.(c)?.unscheduled||items.some(x=>x.course===c&&(dates(x).some(reviewCalendarDay)||completed(x)>0))))}
 function homeSummary(due,overdue,event,diff){
  const parts=[];
  if(overdue)parts.push(overdue+' '+(overdue===1?'review':'reviews')+' overdue');
  if(due)parts.push(due+' due today');
  if(!due&&!overdue)parts.push('No reviews waiting');
  let line=parts.join(', ')+'.';
  if(event)line+=' '+(diff===0?event+' is today.':event+' is in '+diff+' '+(diff===1?'day.':'days.'));
  return line;
 }
 dashboard=function(){
  const b=datedReviewBuckets(),event=nextAssessment(DATA.events,day),remaining=b.due.length,overdue=b.overdue.length,done=b.complete.length;
  const details=event?.detail?event.detail.replace(/\s*·\s*\d{2}:\d{2}.*$/,''):'';
  const label=event?event.title.replace(/\s+/g,' ').trim():'';
  const eventName=event&&/^TBL/i.test(label)&&/CVP/i.test(event.source||'')?'CVP 112 · '+label:label;
  const diff=event?Study.gap(event.date,day):null;
  const style=assessmentStyle(event);
  const countdown=event?(diff===0?'Today':diff+' '+(diff===1?'day':'days')+' away'):'No assessment scheduled';
  const lead=overdue?{n:overdue,l:overdue===1?'review overdue':'reviews overdue',tone:'late'}:{n:remaining,l:remaining===1?'review due today':'reviews due today',tone:''};
  const group=window.reviewGroupLabel?.()||'Made by Hatem';
  const courses=homeCourses();
  const hideQueue=settings.reviewQueueHidden===true;
  return `<div class="home-top"><div>${group==='Made by Hatem'?'':`<span class="home-kicker" data-profile-group>${esc(group)}</span>`}<h1>${esc(fullDate(day).replace(/\s\d{4}$/,''))}</h1><p class="home-summary">${esc(homeSummary(remaining,overdue,eventName,diff))}</p></div></div>
  <div class="home-feature-grid${hideQueue?' home-feature-grid-wide':''}"><section class="home-spotlight assessment-theme-${style.theme}" style="${window.reviewAssessmentGradientStyle(event)}"><div class="home-spotlight-content"><div class="home-overline"><span class="home-overline-dot"></span> Next assessment</div><h2>${event?esc(eventName):'Your next milestone'}</h2><div class="home-countdown">${esc(countdown)}</div><p>${event?esc(fullDate(event.date)+(details?' · '+details:'')):'No later TBL or exam is listed in your supplied schedule.'}</p><button data-view="calendar" ${event?'data-day="'+esc(event.date)+'"':''}>Open schedule</button></div><div class="home-orbit" aria-hidden="true"><i></i><i></i><i></i><span>${style.icon}</span></div></section>
  ${hideQueue?'':`<section class="home-focus-card ${lead.tone}"><h2 class="home-card-label">Review queue</h2><div class="home-focus-value">${lead.n}<small>${lead.l}</small></div><dl class="home-focus-meta">${overdue?`<div><dt>Due today</dt><dd>${remaining}</dd></div>`:`<div><dt>Overdue</dt><dd>0</dd></div>`}<div><dt>Today’s tasks completed</dt><dd>${done}</dd></div></dl><button class="home-text-link" data-view="planner">Open daily tasks</button></section>`}</div>
  <nav class="home-shortcuts" aria-label="Study tools"><button class="home-shortcut" data-view="learning"><span class="home-short-icon">${navGlyph('book')}</span><span><strong>Lessons</strong><small>Teaching and topic quizzes</small></span></button><button class="home-shortcut" data-view="practice"><span class="home-short-icon">${navGlyph('practice')}</span><span><strong>Practice</strong><small>Question sets, mocks, past papers</small></span></button><button class="home-shortcut" data-view="anki"><span class="home-short-icon">${navGlyph('library')}</span><span><strong>Flashcards</strong><small>Anki decks and review queue</small></span></button></nav>
  <div class="home-content-grid"><div class="home-tasks"><div class="home-section-title"><h2>Today’s reviews</h2><button class="home-text-link" data-view="planner">Full plan</button></div>${dayTaskPanels()}</div><div class="home-insights">${homeDaySchedule()}<section class="home-insights-card"><div class="home-agenda-heading"><h2>Progress</h2></div><p>Completed review passes in your current courses.</p>${courses.map(c=>progress(c)).join('')||'<p class="home-agenda-empty">No scheduled reviews in your current courses.</p>'}<button class="home-text-link" data-view="learning">Open lessons</button></section><details class="home-more"><summary>Readiness and study activity</summary><div class="home-more-content">${courses.map(c=>readinessCard(c)).join('')}${scoreExplanation()}${heatmap()}</div></details></div></div>`;
 };
 render();
})();
