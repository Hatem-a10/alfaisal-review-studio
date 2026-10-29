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
 dashboard=function(){
  const b=datedReviewBuckets(),event=nextAssessment(DATA.events,day),remaining=b.due.length,overdue=b.overdue.length;
  const details=event?.detail?event.detail.replace(/\s*·\s*\d{2}:\d{2}.*$/,''):'';
  const label=event?event.title.replace(/\s+/g,' ').trim():'';
  const eventName=event&&/^TBL/i.test(label)&&/CVP/i.test(event.source||'')?'CVP 112 · '+label:label;
  const diff=event?Study.gap(event.date,day):null;
  const countdown=event?(diff===0?'Today':diff+' '+(diff===1?'day':'days')+' away'):'No assessment scheduled';
  return `<div class="home-top"><div><span class="home-kicker"><span></span> YOUR STUDY SPACE · M1-A / 1.6</span><h1>Let’s make today count<span>.</span></h1><p>${esc(fullDate(day))} <b> / </b> Your plan, your pace.</p></div><div class="home-top-tag">ALFAISAL <span>✳</span> M1</div></div>
  <div class="home-feature-grid"><section class="home-spotlight"><div class="home-spotlight-content"><div class="home-overline"><span class="home-overline-dot"></span> NEXT ASSESSMENT</div><h2>${event?esc(eventName):'Your next milestone'}</h2><div class="home-countdown">${esc(countdown)}</div><p>${event?esc(fullDate(event.date)+(details?' · '+details:'')):'No later TBL or exam is listed in your supplied schedule.'}</p><button data-view="calendar" ${event?'data-day="'+esc(event.date)+'"':''}>Open schedule <span>↗</span></button></div><div class="home-orbit" aria-hidden="true"><i></i><i></i><i></i><span>✳</span></div></section>
  <section class="home-focus-card"><div class="home-card-label">THE DAY AT A GLANCE <span>↗</span></div><div class="home-focus-value">${remaining}<small>due today</small></div><div class="home-focus-divider"></div><div class="home-focus-meta"><span><b>${overdue}</b> overdue</span><span><b>${b.complete.length}</b> completed today</span></div><button class="home-text-link" data-view="planner">Open daily tasks <span>→</span></button></section></div>
  <div class="home-section-title"><div><span class="home-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Your study space</h2></div><span>Everything you need, in one place.</span></div>
  <div class="home-shortcuts"><button class="home-shortcut" data-view="learning"><span class="home-short-icon lilac">${navGlyph('book')}</span><span><strong>Learn & master</strong><small>Lessons and topic quizzes</small></span><b>↗</b></button><button class="home-shortcut" data-view="practice"><span class="home-short-icon peach">${navGlyph('practice')}</span><span><strong>Practice & exams</strong><small>Question sets, mocks and past papers</small></span><b>↗</b></button><button class="home-shortcut" data-view="anki"><span class="home-short-icon mint">${navGlyph('library')}</span><span><strong>Flashcards</strong><small>Your Anki decks and review queue</small></span><b>↗</b></button></div>
  <div class="home-content-grid"><div class="home-tasks"><div class="home-section-title"><div><span class="home-kicker">YOUR PLAN</span><h2>Today’s reviews</h2></div><button class="home-text-link" data-view="planner">Full plan →</button></div>${dayTaskPanels()}</div><aside class="home-insights"><section class="home-insights-card"><div class="home-card-label">YOUR PROGRESS <span>✳</span></div><h2>One review at a time.</h2><p>Your completed passes across both courses.</p>${progress('MOL')}${progress('CVP')}<button class="home-text-link" data-view="lectures">All lectures →</button></section><details class="home-more"><summary>Readiness & study activity <span>＋</span></summary><div class="home-more-content">${readinessCard('MOL')}${readinessCard('CVP')}${scoreExplanation()}${heatmap()}</div></details><details class="home-more"><summary>Classes & events <span>＋</span></summary><div class="home-more-content">${classList(day)}<button data-view="calendar">Open schedule ↗</button></div></details></aside></div>`;
 };
 render();
})();
