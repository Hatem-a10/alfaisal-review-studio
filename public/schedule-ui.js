'use strict';
let scheduleExpanded=false,scheduleShared=false,scheduleMobileWeek=false;
function paintSyncSummary(message){const s=String(message||''),bad=!storageOK||/paused|choose|unavailable|failed|sign in|saving unavailable/i.test(s),pending=/waiting|new changes|close.*editor/i.test(s),busy=/syncing|connecting/i.test(s),offline=/offline/i.test(s);let label=bad?'Needs attention':pending?'Changes pending':busy?'Syncing…':offline?'Saved locally':/Cloud saved/i.test(s)?'Up to date':/Cloud ready/i.test(s)?'Cloud ready':s||'Connecting…';const summary=$('#syncSummary'),indicator=$('#syncIndicator');if(summary){summary.textContent=label;summary.title=s}if(indicator)indicator.dataset.state=bad?'error':pending?'pending':busy?'busy':offline?'local':'ok';if(/paused|choose the copy/i.test(s))$('#syncWidget').open=true}
function campusTime(n){const h=Math.floor(n/60),m=n%60;return (h%12||12)+':'+String(m).padStart(2,'0')+(h>=12?' pm':' am')}
function campusWeekStart(value){return add(value,-new Date(value+'T12:00:00Z').getUTCDay())}
let officialGroupSchedule=null,groupScheduleError='';
function loadGroupTimetable(){return fetch('/group-timetables.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Timetable unavailable');return r.json()}).then(value=>{if(!value||!Array.isArray(value.events)||!Array.isArray(value.weeks))throw Error('Invalid timetable');applyRenalScheduleAssessments(value);officialGroupSchedule=value;groupScheduleError='';window.reviewAutoRetry?.ok('group-timetable');if(['calendar','dashboard','countdowns'].includes(view)||view==='practice'&&document.querySelector('.assessment-library'))render();return value}).catch(()=>{// Retry quietly; the schedule says it is loading rather than asking for a refresh.
groupScheduleError='';window.reviewAutoRetry?.schedule('group-timetable',()=>loadGroupTimetable());return null})}
const groupTimetableReady=loadGroupTimetable();
function applyRenalScheduleAssessments(timetable){
 const groups=['M1','M2','F1','F2'];
 const clock=minutes=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
 function assessment(title){
  const tbl=title.match(/\bTBL\s*(\d+)\b/i);
  if(tbl)return 'tbl:'+tbl[1];
  if(/\bOSPE\b/i.test(title))return 'ospe';
  if(/\bfinal\b/i.test(title))return 'final';
  return '';
 }
 for(const row of timetable.events){
  if(row?.source!=='Renal Schedule.pdf'||row.kind!=='assessment'||typeof row.title!=='string'||
    row.studentSection||row.labGroups?.length||!Array.isArray(row.studentGroups)||!groups.every(group=>row.studentGroups?.includes(group))||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isInteger(row.start)||!Number.isInteger(row.end)||
    row.start<0||row.end>1440||row.start>=row.end||!Number.isInteger(row.references?.[0]?.page)||row.references[0].page<1)continue;
  const course=row.title.match(/^(REN(?:AL)?|MOL|COM)\b/i)?.[1]?.toUpperCase().replace(/^RENAL$/,'REN')||row.course;
  const key=assessment(row.title);
  if(!['REN','MOL','COM'].includes(course)||!key)continue;
  const type=key.startsWith('tbl:')?'TBL':key==='ospe'?'Official practical exam':'Official final exam';
  const event=DATA.events.find(e=>e.date===row.date&&!e.hubCustom&&!e.adminPublishedAcademic&&
   (e.course===course||new RegExp('^'+course+'(?:AL)?\\b','i').test(e.title||''))&&assessment(e.title||'')===key);
  const detail=clock(row.start)+'–'+clock(row.end);
  const source=row.source+' · page '+row.references[0].page;
  if(event){
   const notes=(event.detail||'').split(' · ').filter(part=>part&&!/^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}$/.test(part.trim()));
   Object.assign(event,{course,detail:[detail,...notes].join(' · '),source});
   continue;
  }
  const title=key.startsWith('tbl:')?course+' TBL '+key.split(':')[1]:row.title;
  DATA.events.push({id:row.id,date:row.date,title,course,type,detail,source});
 }
}
function englishScheduleEvents(start){return GroupSchedules.english(start,settings)}
function campusWeekEvents(start,shared=scheduleShared){return GroupSchedules.selected(start,settings,officialGroupSchedule,CAMPUS_SCHEDULE.events,shared)}
let campusWeekSnapshot=null;
function campusScheduleWeeks(){const base=CAMPUS_SCHEDULE.weeks,official=officialGroupSchedule?.weeks||[];if(campusWeekSnapshot&&campusWeekSnapshot.base===base&&campusWeekSnapshot.official===official)return campusWeekSnapshot.weeks.slice();const weeks=[...base,...official].sort((a,b)=>a.start.localeCompare(b.start));campusWeekSnapshot={base,official,weeks};return weeks.slice()}
function campusCurrentWeeks(start){const weeks=campusScheduleWeeks(),current=weeks.find(w=>w.start===start),renal=current?.course==='REN';return weeks.filter(w=>(w.course==='REN')===renal)}
function campusGroupLabel(){const p=GroupSchedules.profile(settings);return p.group?(p.group+(p.section?'-'+p.section:'')+(p.lab?' · Lab '+p.lab:'')):'Select your academic group in Settings'}

function campusAuthoritativeEvents(rows){return GroupSchedules.authoritative(rows,(officialGroupSchedule?.events||[]).filter(e=>GroupSchedules.assigned(e,settings)))}
function campusCategoryLabel(kind){return ({anatomy:'Anatomy',physiology:'Physiology',mol:'MOL',lab:'Lab',assessment:'Assessment',break:'Break',other:'Other',shared:'Shared lab',english:'English'})[kind]||'Other'}
function campusDoctor(e){if(e.shared||e.kind==='shared')return '';return (e.doctor||e.lecturer||e.detail?.match(/\(?\bDr\.?\s+[^()]+/i)?.[0]?.replace(/^[ (]+|[ )]+$/g,'')||'').trim()}
function campusEventTitle(event){
 const title=event.title.replace(/\s+/g,' ').trim(),detail=event.detail||'';
 if(event.shared||event.kind==='shared')return {title:title.replace(/\s*\(?\bDr\.?\s+[^()]+\)?/i,'').trim(),detail:'Shared evening lab'};
 if(event.course==='REN'){
  const renalClass=['anatomy','physiology'].includes(event.kind)||event.kind==='assessment'&&/^TBL\s+\d+\b/i.test(title);
  return {title:renalClass&&!/^REN(?:AL)?\b/i.test(title)?'REN 123 · '+title:title,detail};
 }
 if(/^[AP]\d+$/.test(title)){
  const item=DATA.items.find(x=>x.id==='CVP-'+title);
  return {title,detail:item?.title||''};
 }
 return {title,detail:event.custom?'Your recurring class':detail};
}
function campusLayout(events){const previous=campusLayout.snapshot,signature=events.map(e=>[e.date,e.start,e.end,e.id]);if(previous&&previous.signature.length===signature.length&&signature.every((value,i)=>value.every((v,j)=>Object.is(v,previous.signature[i][j])))){const reused=new Map();for(let i=0;i<events.length;i++)if(previous.geometry[i])reused.set(events[i],previous.geometry[i]);return reused}const result=new Map(),days=new Map();for(const e of events){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)}for(const rows of days.values()){const ordered=rows.slice().sort((a,b)=>a.start-b.start||a.end-b.end||String(a.id).localeCompare(String(b.id)));let group=[],ends=[],lastEnd=-1;const finish=()=>{const count=ends.length;for(const [e,lane] of group)result.set(e,{lane,count});group=[];ends=[]};for(const e of ordered){if(e.start>=lastEnd){finish();lastEnd=-1}let lane=ends.findIndex(end=>end<=e.start);if(lane<0)lane=ends.length;ends[lane]=e.end;lastEnd=Math.max(lastEnd,e.end);group.push([e,lane])}finish()}campusLayout.snapshot={signature,geometry:events.map(e=>result.get(e))};return result}
function campusPersonalOverlap(e,layout){const p=layout.get(e);if(!p||p.count<2)return '';const width=100/p.count;return 'left:calc('+p.lane*width+'% + 3px);width:calc('+width+'% - 6px);'}
function campusTimeBounds(events,shared,english){let min=480,max=shared?1200:english?1110:1020;for(const e of events){min=Math.min(min,Math.floor(e.start/60)*60);max=Math.max(max,Math.ceil(e.end/60)*60)}return {min,max}}

function campusBoard(start){const allDays=Array.from({length:5},(_,i)=>add(start,i)),compact=matchMedia('(max-width:700px)').matches&&!scheduleMobileWeek,days=compact?[allDays.includes(day)?day:start]:allDays,events=campusWeekEvents(start),{min,max}=campusTimeBounds(events,scheduleShared,settings.englishEnabled!==false),layout=campusLayout(events),scale=1.05,height=(max-min)*scale,hours=Array.from({length:(max-min)/60+1},(_,i)=>min+i*60),eventsByDate=new Map(),dueByDate=new Map();for(const e of events){if(!(e.start<max&&e.end>min))continue;if(!eventsByDate.has(e.date))eventsByDate.set(e.date,[]);eventsByDate.get(e.date).push(e)}for(const t of tasks())if(!t.done)dueByDate.set(t.date,(dueByDate.get(t.date)||0)+1);return `${matchMedia('(max-width:700px)').matches?`<div class="schedule-mobile-picker"><div>${allDays.map((date,i)=>`<button data-day="${date}" aria-pressed="${date===days[0]}">${['Sun','Mon','Tue','Wed','Thu'][i]}<b>${Number(date.slice(-2))}</b></button>`).join('')}</div><button id="scheduleMobileView">${scheduleMobileWeek?'Day view':'Full week'}</button></div>`:''}<p class="schedule-swipe-hint" ${compact?'hidden':''}>Swipe across to see all five days.</p><div class="schedule-scroll"><div class="campus-board ${compact?'campus-mobile-day':''}" style="--campus-height:${height}px;--hour-height:${60*scale}px"><div class="campus-time-head">TIME</div>${days.map((date,i)=>`<button class="campus-day-head ${date===day?'day-current':''}" data-day="${date}"><strong>${['Sunday','Monday','Tuesday','Wednesday','Thursday'][new Date(date+'T12:00:00Z').getUTCDay()]}</strong><span>${new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</span><small>${dueByDate.get(date)||0} reviews due</small></button>`).join('')}<div class="campus-time-axis" style="height:${height}px">${hours.map(n=>`<span style="top:${(n-min)*scale}px">${campusTime(n)}</span>`).join('')}</div>${days.map(date=>`<div class="campus-day-column ${date===day?'column-current':''}" style="height:${height}px">${(eventsByDate.get(date)||[]).map(e=>{const label=campusEventTitle(e),top=(Math.max(e.start,min)-min)*scale,h=Math.max(1,(Math.min(e.end,max)-Math.max(e.start,min))*scale-5);return `<button type="button" class="campus-event campus-${e.kind}" style="top:${top}px;height:${h}px;${campusPersonalOverlap(e,layout)}" data-campus-event="${esc(e.id)}" aria-label="${esc(label.title)}, ${fmt(e.date)}, ${campusTime(e.start)} to ${campusTime(e.end)}"><strong>${esc(label.title)}</strong>${campusDoctor(e)&&h>38?`<span class="campus-doctor">${esc(campusDoctor(e))}</span>`:''}${h>95&&label.detail?`<span>${esc(label.detail)}</span>`:''}${h>65?`<small>${campusTime(e.start)}–${campusTime(e.end)}</small>`:''}</button>`}).join('')}</div>`).join('')}</div></div><div class="schedule-mobile-agenda ${compact?'schedule-agenda-primary':''}" aria-label="Assigned classes for the selected day"><h3>Assigned day sessions</h3>${(eventsByDate.get(day)||[]).sort((a,b)=>a.start-b.start).map(e=>{const label=campusEventTitle(e);return `<button type="button" class="campus-agenda-card campus-${e.kind}" data-campus-event="${esc(e.id)}"><span>${campusTime(e.start)}–${campusTime(e.end)}</span><strong>${esc(label.title)}</strong>${campusDoctor(e)?`<small>${esc(campusDoctor(e))}</small>`: ''}${e.room?`<small>${esc(e.room)}</small>`:''}</button>`}).join('')||'<p>No assigned sessions documented for this day.</p>'}</div>`}
function campusDailyDetails(){const reviews=DATA.items.filter(x=>dates(x).includes(day)&&!globalThis.reviewCourseClosed?.(x.course,day)),events=campusWeekEvents(campusWeekStart(day),false).filter(e=>e.date===day),untimed=campusAuthoritativeEvents(DATA.events).filter(e=>e.date===day&&!/timetable/i.test(String(e.source||''))&&!CAMPUS_SCHEDULE.events.some(c=>c.date===e.date&&/Mid.?Term/i.test(c.title)&&/Midterm/i.test(e.title)));return `<div class="schedule-day-details"><section class="panel"><div class="section-head"><h2>Reviews · ${fmt(day)}</h2><span class="pill">${tasks().filter(t=>t.date===day&&!t.done).length} remaining</span></div>${reviews.length?reviews.map(row).join(''):'<div class="empty">No review passes planned for this day.</div>'}</section><section class="panel campus-agenda"><h2>Campus · ${fmt(day)}</h2>${events.length?events.map(e=>`<button data-campus-event="${esc(e.id)}"><span class="agenda-dot campus-${e.kind}"></span><span><strong>${esc(campusEventTitle(e).title)}</strong><small>${campusTime(e.start)}–${campusTime(e.end)}</small></span></button>`).join(''):'<p class="muted">No assigned sessions documented for this day.</p>'}${untimed.length?`<div class="untimed-events"><h3>Other documented dates</h3>${untimed.map(e=>`<p><b>${esc(e.title)}</b><br><small>${esc(e.detail||e.source)} · ${esc(e.type)}</small></p>`).join('')}</div>`:''}</section></div>`}
calendar=function(){const start=campusWeekStart(day),week=campusScheduleWeeks().find(w=>w.start===start),last=add(start,4),events=campusWeekEvents(start);return `<div class="schedule-page"><section class="schedule-hero"><div><h1>Weekly schedule</h1><p>${week?(week.course==='REN'?'Renal · ':'')+'Week '+week.number+' · ':''}${fmt(start)} – ${fmt(last)}</p><span class="schedule-group">${esc(campusGroupLabel())}</span></div><button id="expandSchedule" class="primary" aria-expanded="${scheduleExpanded}">${scheduleExpanded?'↙ Exit expanded view':'⛶ Expand full timetable'}</button></section><section class="panel schedule-panel"><div class="schedule-toolbar"><div class="schedule-week-nav"><button data-day="${add(day,-7)}" aria-label="Previous schedule week">←</button><button id="scheduleToday">This week</button><button data-day="${add(day,7)}" aria-label="Next schedule week">→</button></div><div class="schedule-week-picker">${campusCurrentWeeks(start).map(w=>`<button data-day="${w.start}" class="${w.start===start?'selected':''}" aria-label="${w.course==='REN'?'Renal ':''}Week ${w.number}: ${fmt(w.start)}">${w.number}</button>`).join('')}</div><div class="schedule-toggles"><label class="shared-lab-toggle"><input type="checkbox" id="scheduleEnglish" ${settings.englishEnabled!==false?'checked':''}> English</label><label class="shared-lab-toggle"><input type="checkbox" id="scheduleShared" ${scheduleShared?'checked':''}> Shared evening labs</label></div></div>${groupScheduleError?`<p class="notice">${esc(groupScheduleError)}</p>`:!officialGroupSchedule?'<p role="status">Loading group timetable…</p>':''}${!events.some(e=>!e.custom)?'<p class="muted">No official sessions documented for your group this week.</p>':''}${events.some((e,i)=>!e.custom&&events.some((v,j)=>j>i&&!v.custom&&v.date===e.date&&v.start<e.end&&v.end>e.start))?'<p class="notice">Official sessions overlap this week. Both are shown; confirm with your course coordinator.</p>':''}${campusBoard(start)}<div class="schedule-legend">${['anatomy','physiology','mol','lab','assessment','break','other','english'].map(k=>`<span><i class="campus-${k}"></i>${campusCategoryLabel(k)}</span>`).join('')}</div>${calendarPaletteEditor()}</section>${campusDailyDetails()}</div>`};

function openCampusEvent(id){
 const event=campusWeekEvents(campusWeekStart(day),true).find(item=>item.id===id);
 const dialog=$('#campusEventDialog'),body=$('#campusEventBody');
 if(!event||!dialog||!body)return;
 const {title,detail}=campusEventTitle(event);
 const lecturer=campusDoctor(event);
 body.innerHTML=`<span class="pill">${esc(campusCategoryLabel(event.kind))}</span>
  <h2>${esc(title)}</h2>${detail?`<p>${esc(detail)}</p>`:''}
  <p>${fullDate(event.date)} · <b>${campusTime(event.start)}–${campusTime(event.end)}</b></p>
  ${lecturer&&!detail.includes(lecturer)?`<p>${esc(lecturer)}</p>`:''}
  ${event.room&&!detail.includes(event.room)?`<p>${esc(event.room)}</p>`:''}
  ${event.custom?'<p class="section-sub">Change recurring English classes in Site Settings.</p>':''}`;
 if(!dialog.open)dialog.showModal();
}
const renderBeforeSchedule=render;render=function(){renderBeforeSchedule();document.body.classList.toggle('schedule-expanded',view==='calendar'&&scheduleExpanded);if(view==='calendar'){const extras=$('#navExtras');if(extras&&!extras.querySelector?.('button.active'))extras.open=false}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='scheduleMobileView'){scheduleMobileWeek=!scheduleMobileWeek;render()}if(b.id==='expandSchedule'){scheduleExpanded=!scheduleExpanded;render()}if(b.id==='scheduleToday'){day=today();$('#day').value=day;render()}if(b.dataset.campusEvent)openCampusEvent(b.dataset.campusEvent);if(b.id==='closeCampusEvent')$('#campusEventDialog').close()});
document.addEventListener('change',e=>{if(e.target.id==='scheduleShared'){scheduleShared=e.target.checked;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&scheduleExpanded){scheduleExpanded=false;render()}});
paintSyncSummary($('#syncState').textContent);render();

matchMedia('(max-width:700px)').addEventListener('change',()=>{if(view==='calendar')render()});
