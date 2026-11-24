'use strict';
(()=>{
 const validAt=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const clocks=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).filter(([k,t])=>k.length<70&&validAt(t)).slice(0,80)):{};
 const baseValidate=validateBackup;validateBackup=function(raw){const out=baseValidate(raw);for(const[id,r]of Object.entries(out)){const input=raw.records[id];if(input._changed)r._changed=clocks(input._changed);if(typeof input.skipThird==='boolean')r.skipThird=input.skipThird;if(input.finalThirdDate===null||validDate(input.finalThirdDate))r.finalThirdDate=input.finalThirdDate;if(validAt(input.masteryHandledAt))r.masteryHandledAt=input.masteryHandledAt;if(validAt(input.autoFirstAt))r.autoFirstAt=input.autoFirstAt}return out};
 const baseSettings=cleanSettings;cleanSettings=function(raw){return {...baseSettings(raw),_changed:clocks(raw?._changed)}};settings=cleanSettings(settings);
 let baseline=structuredClone(state),settingsBaseline=structuredClone(settings),busy=false,planReady=false,finalCatchup,finalOverflow,finalLoading,finalError;
 function loadFinalCatchup(){
  finalLoading??=import('/final-catchup.mjs?v=3').then(m=>{({finalCatchup,finalOverflow}=m);render()}).catch(()=>{
   finalError=true;render();
  });
 }
 const basePersist=persist;persist=function(){const at=new Date().toISOString();StudyAutopilot.stampChanges(baseline,state,at);settings._changed={...settings._changed};for(const k of new Set([...Object.keys(settingsBaseline),...Object.keys(settings)]))if(k!=='_changed'&&JSON.stringify(settings[k])!==JSON.stringify(settingsBaseline[k]))settings._changed[k]=at;baseline=structuredClone(state);settingsBaseline=structuredClone(settings);syncMeta.localUpdatedAt=at;basePersist()};
 const baseSchedule=scheduleSync;scheduleSync=function(){syncMeta.localUpdatedAt=new Date().toISOString();baseSchedule()};
 const baseAdopt=adoptCloud;adoptCloud=function(remote){busy=true;try{baseAdopt(remote)}finally{busy=false}baseline=structuredClone(state);settingsBaseline=structuredClone(settings);planReady=true;if(runAutopilot())render()};
 window.resolveAutoConflict=function(remote){
  try{try{recoverBackup()}catch{}const localAt=syncMeta.localUpdatedAt||saved.updatedAt||'',remoteAt=remote.updatedAt||'';
   state=StudyAutopilot.mergeRecords(state,validateBackup(remote.snapshot),localAt,remoteAt,mergeRecords);
   settings=StudyAutopilot.mergeSettings(settings,cleanSettings(remote.snapshot.settings),localAt,remoteAt);
   StudyVault.apply(StudyVault.merge(StudyVault.snapshot(),remote.snapshot.extras));
   baseline=structuredClone(state);settingsBaseline=structuredClone(settings);syncMeta={...syncMeta,revision:remote.revision,dirty:true};syncConflict=null;$('#syncConflict').hidden=true;storeLocalOnly();saveSyncMeta();planReady=true;scheduleSync();render();return true;
  }catch(e){syncConflict=null;syncMessage('Sync retry needed · device copy retained');console.error('Sync reconciliation failed',e.message);return false}
 };
 const baseMessage=syncMessage;syncMessage=function(message){baseMessage(message);if(/Cloud saved|Cloud ready|unavailable|Sign in|Offline/i.test(message)){planReady=true;queueMicrotask(()=>{if(runAutopilot())render()})}};
 const finalDate=()=>AssessmentPlan.cvpFinalDate(DATA.events);
 const inFinalWindow=(date,final)=>!!final&&date<final&&Study.gap(final,date)<=14;
 const optionalThird=(x,date,current,final)=>StudyAutopilot.thirdOptional(rec(x),x.course,date,current,final);
 const baseTasks=tasks;tasks=function(items=DATA.items){
  const final=finalDate(),current=today();
  const plan=storeOptions().autopilot?.lastPlan;
  const overflow=new Set(inFinalWindow(current,final)&&plan?.final===final&&!plan.undone?
   (plan.unplaced||[]).filter(u=>u.pass===1&&u.date).map(u=>u.id+':'+u.date):[]);
  return baseTasks(items).filter(t=>t.done||(!(t.p===1&&overflow.has(t.x.id+':'+t.date))&&!(t.p===2&&optionalThird(t.x,t.date,current,final))&&
   !(t.x.course==='CVP'&&final&&(day>=final||t.date>=final))));
 };
 const baseRowWithPlan=row;row=function(x){let html=baseRowWithPlan(x);const current=today(),final=finalDate(),protectedWindow=inFinalWindow(current,final);if(optionalThird(x,dates(x)[2],current,final))html=html.replace(/<label class="pass [^"]*">(?:(?!<label)[\s\S])*?data-pass="2"[\s\S]*?<\/label>/,'<div class="pass optional-pass"><strong>Third review optional</strong><small>Outside the active queue</small>'+(protectedWindow?'':'<button data-restore-third="'+esc(x.id)+'">Restore</button>')+'</div>');return html};
 const baseReviewItem=datedReviewItem;datedReviewItem=function(t){const plan=storeOptions().autopilot?.lastPlan,focused=!t.unscheduled&&t.x.course==='CVP'&&!t.done&&t.p<2&&plan?.focused&&!plan.undone&&t.date>=today()&&t.date<plan.final?' · '+[25,20][t.p]+' min focused review':'';return baseReviewItem(t).replace('</small>',focused+'</small>').replace('</small>',''+(t.p===0&&t.done===rec(t.x).autoFirstAt?' · MCQ mastery':'')+'</small>')};
 function mastered(x){const l=lessonById(x.id);if(!l||!state[x.id]?.learning)return false;return Learn.status(l,rec(x),today()).passed===true}
 function latestMastery(x){const l=lessonById(x.id);if(!l)return '';return [...inlineLatest(l).values()].map(v=>v.at).filter(validAt).sort().at(-1)||''}
 function capacity(d,after=0){if(typeof ACADEMIC_IMPORT!=='undefined'&&!storeOptions().allowBreakStudy&&ACADEMIC_IMPORT.breaks.some(([a,b])=>d>=a&&d<=b))return 0;const minute=v=>Number(v.slice(0,2))*60+Number(v.slice(3)),start=Math.max(after,minute(settings.start||'17:00')),end=minute(settings.end||'23:00'),events=campusWeekEvents(campusWeekStart(d),false).filter(e=>e.date===d).map(e=>[Math.max(start,e.start),Math.min(end,e.end)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);let cursor=start,free=0;for(const[a,b]of events){free+=Math.max(0,a-cursor);cursor=Math.max(cursor,b)}free+=Math.max(0,end-cursor);const budget=(settings.budget!==null&&settings.budget!==''&&Number.isFinite(Number(settings.budget))?Math.max(0,Number(settings.budget)):180);let completedMinutes=0,timed=0;for(const r of Object.values(state)){completedMinutes+=Object.entries(r.done||{}).filter(([,at])=>at&&Study.localDate(at)===d).reduce((n,[p])=>n+[35,25,15][+p],0);timed+=(r.sessions||[]).filter(s=>Study.localDate(s.endedAt)===d).reduce((n,s)=>n+s.seconds/60,0)}const spent=Math.max(completedMinutes,Math.ceil(timed));return Math.max(0,after?Math.min(free,budget-spent):Math.min(free,budget)-spent)}
 function runAutopilot(){if(busy)return false;busy=true;let changed=false;try{
  const scheduledItems=DATA.items.filter(item=>(item.course!=='REN'||dates(item).some(Boolean))&&!globalThis.reviewCourseClosed?.(item.course));
  const final=finalDate(),current=today(),finalWindow=inFinalWindow(current,final);
  for(const x of scheduledItems){if(x.course==='CVP'&&final&&current>=final)continue;if(!finalWindow&&StudyAutopilot.restoreThird(rec(x),mastered(x),Study.mcq(rec(x)).accuracy)){state[x.id]={...rec(x),skipThird:false};changed=true}if(done(x,0)||!mastered(x))continue;const at=StudyAutopilot.firstStudyAt(rec(x),true,latestMastery(x));if(!at)continue;state[x.id]={...rec(x),done:{...rec(x).done,0:at},autoFirstAt:at,masteryHandledAt:at};changed=true}
  const opts=storeOptions(),auto=opts.autopilot||{};
  const clock=assessmentClock(),cvp=DATA.items.filter(x=>x.course==='CVP');
  const cvpOverdue=cvp.reduce((n,x)=>n+[0,1].filter(p=>!done(x,p)&&dates(x)[p]<current).length,0);
  const finalPlan=planReady&&finalWindow&&(auto.requestFinalCatchup||
   (auto.enabled!==false&&auto.undoDay!==current&&(auto.finalCatchupVersion!==final+':3'||
   (cvpOverdue>=6&&auto.lastAttemptDay!==current))));
  if(!finalCatchup&&!finalError&&finalWindow&&view==='planner')loadFinalCatchup();
  if(finalPlan&&!finalCatchup){if(!finalError)loadFinalCatchup();if(changed)persist();return changed}
  const balanced=planReady&&!finalWindow&&auto.assessmentPlanVersion!==1;
  const planSettings={...settings,hard:x=>Study.hard(rec(x)),canSkip:x=>{const m=Study.mcq(rec(x));return m.accuracy===null||m.accuracy>=85}};
  const plan=finalPlan?finalCatchup(AssessmentPlan,scheduledItems,state,current,DATA.events,d=>capacity(d,d===current?clock.minute:0)):
   balanced?AssessmentPlan.spread(scheduledItems,state,current,planSettings,DATA.events,mastered,capacity,clock.minute):
   finalWindow?null:StudyAutopilot.automaticRebalance(scheduledItems,state,current,planSettings,DATA.events,mastered,capacity,{...auto,ready:planReady});
  if(plan){const at=new Date().toISOString(),applied=plan.changes.length>0;
   if(applied){state=plan.records;changed=true}
   saveOptions({...opts,autopilot:{...auto,...(balanced?{assessmentPlanVersion:1}:{}),...(finalPlan?{finalCatchupVersion:final+':3',requestFinalCatchup:false}:{}),lastAttemptDay:today(),...(applied||finalPlan||balanced?{lastPlanDay:today(),undoDay:null,lastPlan:{at,changes:plan.changes,unplaced:plan.unplaced,late:plan.late||[],assessmentBalanced:balanced,...(finalPlan?{final,firstPlaced:plan.firstPlaced,secondPlaced:plan.secondPlaced,focused:plan.focused}: {})},log:[{at,moved:plan.changes.filter(c=>c.field.startsWith('dates.')).length,optional:plan.omitted.length,unplaced:plan.unplaced.length},...(auto.log||[])].slice(0,8)}:{})}});
  }
  if(changed)persist();return changed;
 }finally{busy=false}}
 let realDay=today();const baseRender=render;render=function(){const current=today();if(current!==realDay){if(day===realDay){day=current;$('#day').value=current}realDay=current}if(lessonCourse==='midterm')lessonCourse='MOL';if(filters.course==='midterm')filters.course='MOL';if(typeof etScope!=='undefined'&&etScope==='midterm')etScope='MOL';if(typeof etMockScope!=='undefined'&&etMockScope==='midterm')etMockScope='MOL';runAutopilot();baseRender()};
 const basePanels=dayTaskPanels;dayTaskPanels=function(){const a=storeOptions().autopilot||{},p=a.lastPlan,log=a.log?.[0];const final=AssessmentPlan.cvpFinalDate(DATA.events),finalWindow=!!final&&today()<final&&Study.gap(final,today())<=14;return basePanels()+`<details class="panel auto-plan-status"><summary>Adaptive study plan${log?' · '+log.moved+' reviews reorganized':''}</summary><button id="rebalanceAssessments">${finalWindow?'Rebuild CVP final plan':'Rebalance around assessments'}</button>${finalError?'<p>Could not load plan. Retry above.</p>':''}${finalWindow?`<p>Third reviews fill spare time before ${fmt(final)}.</p>`:''}${finalWindow&&p?.final===final?`<p>${p.firstPlaced} first and ${p.secondPlaced} second reviews scheduled. Exam eve: max two second reviews.</p>${finalOverflow?.(p,DATA.items,done,dates,courseDayTasks)||''}${p.focused?'<p>Focused reviews: 25 / 20 minutes.</p>':''}`:''}<label><input type="checkbox" id="autoPlanEnabled" ${a.enabled!==false?'checked':''}> Automatic catch-up</label>${p?.unplaced?.length?`<p class="notice">${p.unplaced.length} ${p.final?'reviews still need a slot.':'reviews need rescheduling.'}</p>`:''}${p?.late?.length?`<p class="notice">${p.late.length} reviews fall on or after their assessment.</p>`:''}${p&&!p.undone?'<button id="undoAutoPlan">Undo latest adjustment</button>':''}</details>`};
 document.addEventListener('change',e=>{if(e.target.id==='autoPlanEnabled'){const o=storeOptions();saveOptions({...o,autopilot:{...o.autopilot,enabled:e.target.checked}});render()}});
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='rebalanceAssessments'){if(finalError){finalError=false;finalLoading=null}const o=storeOptions(),final=AssessmentPlan.cvpFinalDate(DATA.events),finalWindow=!!final&&today()<final&&Study.gap(final,today())<=14;saveOptions({...o,autopilot:{...o.autopilot,...(finalWindow?{requestFinalCatchup:true}:{assessmentPlanVersion:0}),undoDay:null}});render();const a=storeOptions().autopilot;toast((finalWindow?!a?.requestFinalCatchup:a?.assessmentPlanVersion===1)?'Study plan updated':'Waiting for progress sync');return}if(b.dataset.restoreThird){const x=DATA.items.find(x=>x.id===b.dataset.restoreThird);if(x){state[x.id]={...rec(x),skipThird:false};persist();render();toast('Third review restored')}}if(b.id==='undoAutoPlan'){const o=storeOptions(),a=o.autopilot||{},p=a.lastPlan;if(!p||p.undone)return;for(const c of p.changes){const r=state[c.id]||{},[key,index]=c.field.split('.');if(key==='dates'){const x=DATA.items.find(x=>x.id===c.id),d=[...(r.dates||x.dates)];if(d[index]===c.after){d[index]=c.before;r.dates=d}}else if(r[key]===c.after)r[key]=c.before;state[c.id]=r}saveOptions({...o,autopilot:{...a,undoDay:today(),lastPlan:{...p,undone:true}}});persist();render();toast('Plan changes undone')}});
 if(syncConflict)resolveAutoConflict(syncConflict);render();
})();
