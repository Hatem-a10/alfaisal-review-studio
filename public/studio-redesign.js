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
 let stainDates=null,stainKey='';function assessmentDates(){const key=DATA.events.length+':'+(DATA.events.at?.(-1)?.date||'');if(stainDates&&stainKey===key)return stainDates;stainKey=key;stainDates=[...new Set(DATA.events.map(e=>e.date))].sort().filter(d=>{const e=nextAssessment(DATA.events,d);return e&&e.date===d});return stainDates}
 /* One histology stain per assessment, shared by the home card, countdown cards and the site accent. */
 window.reviewStainFor=event=>{if(!event?.date)return null;const i=assessmentDates().indexOf(event.date);return i<0?null:i%8};
 window.reviewNextStain=()=>{try{const c=assessmentClock();return window.reviewStainFor(nextAssessment(DATA.events,c.date))??0}catch{return 0}};
 function assessmentStyle(event){if(!event)return {theme:0,icon:'✳'};const index=Math.max(0,assessmentDates().indexOf(event.date));return {theme:index%8,icon:['✳','◈','✦','◉','✺','◇','✷','⌁'][index%8]}};
 function homeDaySchedule(date=day){const events=campusWeekEvents(campusWeekStart(date),false).filter(e=>e.date===date&&!/prayer|lunch/i.test(e.title||'')).sort((a,b)=>a.start-b.start);const guides=DATA.events.filter(e=>e.date===date&&e.type==='MOL assessment guide'&&!events.some(x=>/MOL/i.test(x.title)&&(/TBL/i.test(x.title)===/TBL/i.test(e.title))));const rows=events.map(e=>`<button class="home-agenda-row" data-campus-event="${esc(e.id)}"><span class="home-agenda-time">${esc(campusTime(e.start))}</span><span class="agenda-dot campus-${esc(e.kind)}"></span><span class="home-agenda-copy"><strong>${esc(campusEventTitle(e).title)}</strong><small>${esc(campusEventTitle(e).detail||campusCategoryLabel(e.kind))}</small></span></button>`).join('')+guides.map(e=>`<div class="home-agenda-row home-guide-event"><span class="home-agenda-time">${esc((e.detail||'').match(/\d{2}:\d{2}–\d{2}:\d{2}/)?.[0]||'Time not listed')}</span><span class="agenda-dot campus-assessment"></span><span class="home-agenda-copy"><strong>${esc(e.title)}</strong><small>${esc(e.detail||'Assessment guide')}</small></span></div>`).join('');return `<section class="home-insights-card home-agenda"><div class="home-agenda-heading"><h2>Today’s schedule</h2><span>${esc(fmt(date))}</span></div><div class="home-agenda-list">${rows||'<p class="home-agenda-empty">No classes or events listed for this day.</p>'}</div><button class="home-text-link" data-view="calendar">Full schedule</button></section>`}
 // Active courses for progress: open (not closed after their final) and not archived.
 function homeCourses(){const items=DATA.items||[],seen=[...new Set(items.map(x=>x.course).filter(Boolean))];return seen.filter(c=>!window.reviewCourseClosed?.(c)&&!window.reviewArchivedStudyItem?.({course:c})&&(!window.reviewCourseConfig?.(c)?.unscheduled||items.some(x=>x.course===c&&(dates(x).some(reviewCalendarDay)||completed(x)>0))))}
 function nextLesson(){
  const eligible=DATA.items.filter(item=>!window.reviewCourseClosed?.(item.course)&&window.reviewStudyItemVisible?.(item)!==false);
  const current=eligible.filter(item=>item.course==='REN');
  const candidates=current.length?current:eligible;
  return candidates.find(item=>!done(item,0))||candidates[0];
 }
 dashboard=function(){
  const date=today(),reviews=datedReviewBuckets(date),event=nextAssessment(DATA.events,date);
  const group=window.reviewGroupLabel?.();
  const courses=homeCourses(),lesson=nextLesson();
  const reviewSummary=reviews.due.length?reviews.due.length+' due today':reviews.overdue.length?'No reviews due today.':'You’re caught up. No reviews due.';
  const start=lesson?`<h2>${lesson.course==='REN'&&isFirstRenalLesson(lesson)?'Start your first Renal lesson':'Open your next lesson'}</h2><p>${esc(lesson.code+' · '+title(lesson))}</p><button class="primary" type="button" data-lesson="${esc(lesson.id)}">Open lesson</button>`:
    '<h2>Ready to study?</h2><button class="primary" type="button" data-view="learning">Browse lessons</button>';
  const expanded=document.querySelector('#homeStudyOverview')?.open;
  return `<header class="home-top"><div>${group&&group!=='Made by Hatem'?`<span class="home-kicker" data-profile-group>${esc(group)}</span>`:''}<h1>Home</h1><p class="home-summary">${esc(fullDate(date))}</p></div></header>
  <section class="panel home-next-action" id="homeNextAction">${start}</section>
  <div class="home-content-grid home-daily-grid">${homeDaySchedule(date)}
   <section class="panel home-reviews"><div class="section-head"><h2>Today’s reviews</h2><button type="button" class="home-text-link" data-view="planner" data-day="${esc(date)}">Full plan</button></div>
    <p>${esc(reviewSummary)}${reviews.overdue.length?' '+reviews.overdue.length+' overdue.':''}</p>
    ${reviews.due.slice(0,3).map(datedReviewItem).join('')}
   </section>
  </div>
  <details class="home-more" id="homeStudyOverview" ${expanded?'open':''}><summary>Progress and upcoming assessments</summary>
   <div class="home-more-content">${event?`<section class="panel"><h2>Next assessment</h2><p>${esc(event.title+' · '+fullDate(event.date))}</p><button type="button" data-view="calendar" data-day="${esc(event.date)}">Open schedule</button></section>`:''}
    ${courses.map(c=>progress(c)).join('')}${courses.map(c=>readinessCard(c)).join('')}${scoreExplanation()}${heatmap()}
   </div>
  </details>`;
 };
 function isFirstRenalLesson(lesson){
  return DATA.items.find(item=>item.course==='REN')?.id===lesson.id&&!DATA.items.some(item=>item.course==='REN'&&completed(item)>0);
 }
 render();
})();
