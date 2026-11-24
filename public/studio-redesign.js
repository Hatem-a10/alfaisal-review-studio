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
 function homeDaySchedule(date=day){const events=campusWeekEvents(campusWeekStart(date),false).filter(e=>e.date===date&&!/prayer|lunch/i.test(e.title||'')).sort((a,b)=>a.start-b.start);const guides=DATA.events.filter(e=>e.date===date&&e.type==='MOL assessment guide'&&!events.some(x=>/MOL/i.test(x.title)&&(/TBL/i.test(x.title)===/TBL/i.test(e.title))));const rows=events.map(e=>`<button class="home-agenda-row" data-campus-event="${esc(e.id)}"><span class="home-agenda-time">${esc(campusTime(e.start))}</span><span class="agenda-dot campus-${esc(e.kind)}"></span><span class="home-agenda-copy"><strong>${esc(campusEventTitle(e).title)}</strong><small>${esc(campusEventTitle(e).detail||campusCategoryLabel(e.kind))}</small></span></button>`).join('')+guides.map(e=>`<div class="home-agenda-row home-guide-event"><span class="home-agenda-time">${esc((e.detail||'').match(/\d{2}:\d{2}–\d{2}:\d{2}/)?.[0]||'Time not listed')}</span><span class="agenda-dot campus-assessment"></span><span class="home-agenda-copy"><strong>${esc(e.title)}</strong><small>${esc(e.detail||'Assessment guide')}</small></span></div>`).join('');return `<section class="home-insights-card home-agenda"><div class="home-agenda-heading"><h2>Today’s schedule</h2><span>${esc(fmt(date))}</span></div><div class="home-agenda-list">${rows||'<p class="home-agenda-empty">No classes or events listed for this day.</p>'}</div><button class="home-text-link" data-view="calendar">Full schedule</button></section>`}
 // Active courses for progress: open (not closed after their final) and not archived.
 function homeCourses(){const items=DATA.items||[],seen=[...new Set(items.map(x=>x.course).filter(Boolean))];return seen.filter(c=>!window.reviewCourseClosed?.(c)&&!window.reviewArchivedStudyItem?.({course:c})&&(!window.reviewCourseConfig?.(c)?.unscheduled||items.some(x=>x.course===c&&(dates(x).some(reviewCalendarDay)||evidence(x)))))}
 function nextLesson(){
  const eligible=DATA.items.filter(item=>!window.reviewCourseClosed?.(item.course)&&window.reviewStudyItemVisible?.(item)!==false);
  const current=eligible.filter(item=>item.course==='REN');
  const candidates=current.length?current:eligible;
  return candidates.find(item=>!done(item,0))||candidates[0];
 }
 const evidence=item=>{
  const r=rec(item),progress=r.learning;
  return completed(item)>0||(r.mcqs||[]).some(result=>result.total>0)||(progress?.attempts||[]).length>0||Object.keys(progress?.results||{}).length>0;
 };
 window.reviewHasStudyEvidence=items=>items.some(evidence);
 function homeAssessment(event,date){
  const theme=window.reviewStainFor(event)??0;
  const days=event?Study.gap(event.date,date):null;
  const countdown=days===0?'Today':days===1?'Tomorrow':days===null?'Nothing scheduled':days+' days away';
  const title=event?.title?.replace(/\s+/g,' ').trim();
  const details=event?.detail?.replace(/\s*·\s*\d{2}:\d{2}.*$/,'');
  return `<section class="home-spotlight assessment-theme-${theme}" aria-labelledby="homeAssessmentTitle"><div class="home-spotlight-content">
    <h2 id="homeAssessmentTitle">Upcoming assessment</h2>
    ${event?`<p class="home-assessment-name">${esc(title)}</p>`:''}
    <div class="home-countdown">${esc(countdown)}</div>
    ${event?`<p>${esc([fullDate(event.date),details].filter(Boolean).join(' · '))}</p>`:''}
    <button type="button" data-view="calendar" data-day="${esc(event?.date||date)}">View schedule</button>
  </div></section>`;
 }
 function homeOverdue(overdue){
  const ordered=overdue.slice().sort(compareDatedReviews);
  const remaining=ordered.slice(3);
  const expanded=document.querySelector('#homeOverdueMore')?.open;
  return `<section class="panel home-overdue" aria-labelledby="homeOverdueTitle">
    <div class="section-head"><h2 id="homeOverdueTitle">Overdue reviews</h2><span class="pill">${ordered.length}</span></div>
    ${ordered.length?ordered.slice(0,3).map(datedReviewItem).join(''):'<p class="muted">No overdue reviews.</p>'}
    ${remaining.length?`<details id="homeOverdueMore" ${expanded?'open':''}><summary>Show ${remaining.length} more</summary>${remaining.map(datedReviewItem).join('')}</details>`:''}
  </section>`;
 }
 dashboard=function(){
  const date=today(),reviews=datedReviewBuckets(date),event=nextAssessment(DATA.events,date);
  const group=window.reviewGroupLabel?.();
  const courses=homeCourses(),lesson=nextLesson();
  const reviewSummary=reviews.due.length?reviews.due.length+' due today':'No reviews due today.';
  const firstSession=lesson&&!window.reviewHasStudyEvidence(DATA.items);
  const start=lesson?`<h2>${firstSession?(lesson.course==='REN'?'Start your first Renal lesson':'Start your first lesson'):'Open your next lesson'}</h2><p>${esc(lesson.code+' · '+title(lesson))}</p>${firstSession?'<p>Read the first topic, then try its questions.</p>':''}<button class="primary" type="button" ${firstSession?'data-first-lesson ':''}data-lesson="${esc(lesson.id)}">Open lesson</button>`:
    '<h2>Ready to study?</h2><button class="primary" type="button" data-view="learning">Browse lessons</button>';
  const expanded=document.querySelector('#homeStudyOverview')?.open;
  return `<header class="home-top"><div>${group&&group!=='Made by Hatem'?`<span class="home-kicker" data-profile-group>${esc(group)}</span>`:''}<h1>Home</h1><p class="home-summary">${esc(fullDate(date))}</p></div></header>
  <div class="home-feature-grid home-priority-grid">${homeAssessment(event,date)}<section class="panel home-next-action" id="homeNextAction">${start}</section></div>
  <div class="home-content-grid home-daily-grid"><div class="home-review-column">${homeOverdue(reviews.overdue)}
   <section class="panel home-reviews"><div class="section-head"><h2>Today’s reviews</h2><button type="button" class="home-text-link" data-view="planner" data-day="${esc(date)}">My Study Plan</button></div>
    <p>${esc(reviewSummary)}</p>
    ${reviews.due.slice(0,3).map(datedReviewItem).join('')}
   </section></div>${homeDaySchedule(date)}
  </div>
  <details class="home-more" id="homeStudyOverview" ${expanded?'open':''}><summary>Study progress</summary>
   <div class="home-more-content">
    ${courses.filter(c=>DATA.items.some(item=>item.course===c&&evidence(item))).map(c=>progress(c)).join('')}
    ${courses.filter(c=>DATA.items.filter(item=>item.course===c&&evidence(item)).length>1).map(c=>readinessCard(c)).join('')}
    ${window.reviewHasStudyEvidence(DATA.items)?heatmap():'<p>Check your first topic quiz or complete a review to see your study progress.</p>'}
   </div>
  </details>`;
 };
 render();
})();
