/* global render, view, go, DATA, LEARNING, ORIGINAL_EXAMS, lessonId, guideTopic, guideTopicLesson, cardIndex, learnTab, etExam, originalRun, etPracticeTab, originalQuestionById, visibleOriginalRun, lessonById, inlineTopicsFor, inlineGroups, allLearningQuestions, TEACHING, storeOptions, saveOptions, today, tasks, dates, done, state, rec, persist, AssessmentPlan, assessmentClock, syncMeta, storageOK, openEdit, settings, toast */
import {courses,lectureCourses} from './course-registry.mjs';
import {catchupPreview,revisionQueue,topicCoverage} from './study-next-core.mjs';

const content=()=>document.getElementById('content');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=code=>courses[code]?.label||code;
const localTime=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'No successful sync yet';
const itemById=id=>DATA.items.find(item=>item.id===id);
const hiddenCourse=course=>course==='CVP'&&window.reviewCvpArchived?.()&&!window.reviewArchiveEnabled?.();
let issue=null,preview=null,budget=60,revision=null,seenSchedule=null,paintedLesson='';
const html=(id,markup)=>{
 const host=content();if(!host||host.querySelector('#'+id))return;
 const element=document.createElement('section');element.id=id;element.className='panel study-next-panel';element.innerHTML=markup;host.prepend(element);
};
const options=()=>storeOptions();
function saveOption(key,value){const current=options();saveOptions({...current,[key]:value});}
window.reviewSyncIssue=value=>issue=value;
window.reviewPaintSyncDetails=message=>{
 const host=document.querySelector('#syncWidget .sync-widget-body');if(!host)return;
 let panel=host.querySelector('#studySyncDetails');
 if(!panel){panel=document.createElement('div');panel.id='studySyncDetails';host.append(panel);}
 if(/^Cloud saved/.test(message||''))issue=null;
 panel.innerHTML=`<dl><dt>This device</dt><dd>${storageOK?'Saved':'Device saving unavailable'}</dd><dt>Cloud</dt><dd>${syncMeta.dirty?'Changes waiting to sync':syncMeta.lastCloudAt?'Up to date':'Awaiting confirmation'}</dd><dt>Last successful sync</dt><dd>${esc(localTime(syncMeta.lastCloudAt))}</dd></dl>`+
 (issue?`<p role="status">Check ${esc(issue.recordId||issue.area||'the backup')}. This copy is still on your device.</p><div class="study-next-actions">${itemById(issue.recordId)?'<button data-study-sync-edit>Review lesson record</button>':''}<button data-study-sync-export>Export backup</button><button data-study-sync-retry>Retry sync</button></div>`:'');
};
window.addEventListener('review-profile-changed',()=>{issue=null;revision=null;preview=null;});
window.reviewNoteBookletPosition=(course,q,index)=>{
 const current=options().studyNextBooklet;
 if(current?.id!==q.id)saveOption('studyNextBooklet',{course,id:q.id,index,page:q.page,at:new Date().toISOString()});
};
function activeAttempt(){
 if(etExam&&!etExam.finishedAt&&!etExam.cancelled)return {kind:'mock',id:etExam.id,course:etExam.questions?.[0]?.lectureIds?.[0]?.split('-')[0],title:'Timed mock',position:etExam.xp?.current,total:etExam.questions?.length,answered:Object.keys(etExam.answers||{}).length,at:etExam.startedAt};
 if(originalRun&&!originalRun.finishedAt){const set=ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId);return {kind:'original',id:originalRun.setId,course:set?.course||originalRun.setId?.match(/^(ren|mol|cvp)/i)?.[1]?.toUpperCase(),title:set?.title||'Previous assessment',position:originalRun.xp?.current,total:originalRun.ids?.length,answered:Object.keys(originalRun.answers||{}).length,at:originalRun.startedAt};}
 return null;
}
function resumeCard(){
 const saved=options(),entries=[activeAttempt()];
 const booklet=saved.studyNextBooklet;if(booklet)entries.push({...booklet,kind:'booklet',title:'Booklet',position:booklet.index});
 const lesson=saved.studyNextLesson;
 if(lesson&&itemById(lesson.id))entries.push({...lesson,kind:'lesson',course:itemById(lesson.id).course,title:itemById(lesson.id).title});
 const slots=entries.filter(e=>e&&!(e.course==='CVP'&&window.reviewCvpArchived?.()));
 const host=document.getElementById('homeNextAction');
 if(!host||!slots.length)return;
 const [current,...other]=slots.sort((a,b)=>Number(['mock','original'].includes(b.kind))-Number(['mock','original'].includes(a.kind))||String(b.at||'').localeCompare(String(a.at||'')));
 if(host.querySelector('details[open]'))return;
 const position=e=>e.kind==='lesson'?'Topic '+(e.position+1)+(e.topicTitle?' · '+e.topicTitle:''):Number.isInteger(e.position)?'Question '+(e.position+1)+(e.total?' of '+e.total:''):e.answered+' of '+e.total+' answered';
 const details=e=>[label(e.course),e.title,position(e)].filter(Boolean).join(' · ');
 const markup='<h2>Continue studying</h2><p>'+esc(details(current))+'</p><button type="button" class="primary" data-study-resume="'+current.kind+'">Resume '+(current.kind==='original'||current.kind==='mock'?'exam':current.kind)+'</button>'+
 (other.length?'<details class="home-resume-options"><summary>More to resume</summary>'+other.map(e=>`<button type="button" data-study-resume="${e.kind}">${esc(details(e))}</button>`).join('')+'</details>':'');
 if(host.dataset.resumeMarkup!==markup){host.innerHTML=markup;host.dataset.resumeMarkup=markup;}
}
async function openTopic(id,index){
 const course=itemById(id)?.course;
 if(hiddenCourse(course))return;
 if(course==='CVP'&&window.reviewCvpArchived?.())window.reviewOpenCourse?.(course,'learning');
 await window.reviewEnsureCourses?.([course]);
 window.chooseLesson(id,'lesson');
 if(Number.isInteger(index)){guideTopic=cardIndex=index;guideTopicLesson=id;learnTab='lesson';render();}
}
function topicsFor(questions){
 const scopes=new Set(questions.flatMap(q=>q.lectureIds||[q.lectureId]).filter(Boolean).map(id=>id.split('-')[0]));
 if(!scopes.size&&window.reviewCourseScope)scopes.add(window.reviewCourseScope);
 const rows=[];
 for(const course of scopes){
  for(const item of DATA.items.filter(x=>x.course===course)){
   const lesson=lessonById(item.id);if(!lesson)continue;
   const groups=inlineGroups(lesson).groups;
   inlineTopicsFor(lesson).forEach((topic,index)=>rows.push({id:topic.id,lectureId:lesson.id,index,title:topic.title||topic.concept,questions:groups[index]||[]}));
  }
 }
 return rows;
}
const resultAttempt=()=>etPracticeTab==='original'&&visibleOriginalRun()?originalRun:etPracticeTab==='mock'?etExam:null;
const revisionKey=run=>String(run.id||run.setId)+':'+run.finishedAt;
function reviewPanel(){
 const run=resultAttempt();
 if(!run?.finishedAt||run.cancelled||document.querySelector('#xpExam')||content()?.querySelector('#studyNextRevision'))return;
 html('studyNextRevision','<h2>Revise exam mistakes</h2><button data-study-build-revision>Build revision session</button><div data-study-revision-body></div>');
 paintRevision();
}
async function buildRevision(){
 const run=resultAttempt();
 if(!run?.finishedAt)return;
 const questions=run.ids?run.ids.map(originalQuestionById).filter(Boolean):run.questions;
 const scopes=[...new Set([...questions.flatMap(q=>(q.lectureIds||[]).map(id=>id.split('-')[0])),window.reviewCourseScope].filter(Boolean))];
 await window.reviewEnsureCourses?.(scopes);
 if(view!=='practice'||run!==resultAttempt())return;
 const rows=revisionQueue(run,questions,topicsFor(questions));
 revision={rows,key:revisionKey(run)};
 paintRevision();
}
function paintRevision(){
 const body=content()?.querySelector('[data-study-revision-body]');const run=resultAttempt();
 if(!body||!revision||!run||revision.key!==revisionKey(run))return;
 const {rows}=revision,mapped=rows.filter(r=>r.topic);
 const added=(options().requiredPlannerTasks||[]).some(task=>task.revisionKey===revision.key&&!task.deleted);
 body.innerHTML=rows.length?'<p>'+rows.length+' missed · '+mapped.length+' linked to a lesson topic</p>'+
 (mapped.length?(added?'<p role="status">Added to today’s plan.</p>':'<button data-study-add-revision>Add to today’s plan</button>'):'')+
 '<ol>'+rows.map((row,i)=>`<li>Question ${row.number} · ${esc(row.topic?.title||'Topic mapping unavailable')}${row.topic?` <button data-study-revision-topic="${i}">Open topic</button>`:''}${row.next?` <button data-study-revision-practice="${i}">Try another question</button>`:''}</li>`).join('')+'</ol>':'<p>No scored mistakes in this attempt.</p>';
}
function practiceAlternate(question){
 const dialog=document.createElement('dialog');dialog.className='study-next-dialog';
 dialog.innerHTML=`<form method="dialog"><h2>Practice this concept</h2><p>${esc(question.question)}</p>${question.options.map((option,index)=>`<label class="answer-option"><input type="radio" name="revisionChoice" value="${index}"> ${esc(option)}</label>`).join('')}<button type="button" data-check>Check answer</button> <button>Close</button><p role="status"></p></form>`;
 dialog.querySelector('[data-check]').onclick=()=>{
  const choice=dialog.querySelector('input:checked');
  dialog.querySelector('[role=status]').textContent=choice?(Number(choice.value)===question.answer?'Correct. ':'Correct answer: '+question.options[question.answer]+'. ')+(question.explanation||''):'Choose an answer.';
 };
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function addRevision(){
 const list=options().requiredPlannerTasks||[];
 if(!revision?.rows.some(row=>row.topic))return;
 if(list.some(task=>task.revisionKey===revision.key&&!task.deleted))return;
 const entries=revision.rows.filter(row=>row.topic).map(row=>({lectureId:row.topic.lectureId,index:row.topic.index,title:row.topic.title,questionId:row.next?.id}));
 saveOption('requiredPlannerTasks',[...list,{id:crypto.randomUUID(),date:today(),title:'Revise '+entries.length+' exam mistakes',revisionKey:revision.key,entries,required:true}]);
 paintRevision();
}
function planInputs(){
 const clock=assessmentClock(),items=window.reviewActiveStudyItems?.()||DATA.items,catalog=AssessmentPlan.catalog(DATA.events,DATA.items);
 const targets=new Map(items.map(item=>[item.id,AssessmentPlan.target(item,catalog,clock.date,clock.minute)?.date]));
 return {date:today(),minutes:budget,events:DATA.events,targets,rows:tasks(items)};
}
function calculatePlan(){const input=planInputs();return catchupPreview(input.rows,input);}
function planPanel(){
 const todayTasks=(options().requiredPlannerTasks||[]).filter(t=>t.date===today()&&!t.deleted&&t.revisionKey);
 html('studyNextPlan',`<h2>Catch-up plan</h2><label>Minutes available today <input id="studyNextBudget" type="number" min="5" max="720" step="5" value="${budget}"></label> <button data-study-preview>Preview changes</button><div data-study-plan-preview></div>`+
 (todayTasks.length?'<h3>Exam revision today</h3><ul>'+todayTasks.map(task=>`<li>${esc(task.title)}${task.completedAt?' · completed':` <button data-study-complete="${esc(task.id)}">Mark complete</button>`}<ul>${task.entries.map((entry,i)=>`<li><button data-study-plan-topic="${esc(task.id)}" data-entry="${i}">${esc(entry.title)}</button>${entry.questionId?` <button data-study-plan-question="${esc(entry.questionId)}" data-lecture="${esc(entry.lectureId)}">Try another question</button>`:''}</li>`).join('')}</ul></li>`).join('')+'</ul>':''));
}
function paintPlan(){
 const node=content()?.querySelector('[data-study-plan-preview]');if(!node||!preview)return;
 node.innerHTML=`<p>Keep ${preview.selected.length} reviews today (${preview.used} min). ${preview.unplaced.length} could not be moved within the next 14 days.</p>`+
 (preview.moved.length?'<ul>'+preview.moved.map(m=>`<li>${esc(m.title)} · Review ${m.pass+1} · ${m.from} → ${m.to}</li>`).join('')+'</ul><button data-study-apply>Apply these changes</button>':'');
}
function applyPlan(){
 if(!preview?.moved.length)return;
 const current=calculatePlan();
 if(JSON.stringify(preview.moved)!==JSON.stringify(current.moved)){preview=current;paintPlan();return;}
 for(const move of current.moved){
  const item=itemById(move.id);
  if(!item||done(item,move.pass)||dates(item)[move.pass]!==move.from||dates(item).length!==3)continue;
  const record=rec(item),next=dates(item).slice();next[move.pass]=move.to;
  state[item.id]={...record,dates:next};
 }
 preview=null;persist();render();
}
function scheduleAlerts(){
 const payload=window.reviewPublishedAcademic?.(),rows=payload?.changes;
 if(!rows?.length||seenSchedule===payload.revisionId)return;
 const describe=event=>event?[event.date||event.day,[event.startTime,event.endTime].filter(Boolean).join('–'),event.room,[event.studentGroup,event.studentSection,event.labGroup].filter(Boolean).join(' / ')].filter(Boolean).join(' · '):'Outside your schedule';
 html('studyNextSchedule','<h2>Schedule changes</h2><ul>'+rows.map(change=>`<li><strong>${esc(change.title)}</strong> · ${esc(describe(change.previous))} → ${esc(describe(change.next))}</li>`).join('')+'</ul><button data-study-dismiss-schedule>Dismiss</button>');
}
const tourSteps=[
 ['Learn','Open a lesson, read a topic, then check its questions.','learning','Open Learn'],
 ['Schedule','Find your classes and labs. Open My Study Plan to organize review tasks.','calendar','Open Schedule'],
 ['Practice','Choose a topic quiz, the Booklet, or a timed mock.','practice','Open Practice'],
];
function openWelcomeTour(){
 if(document.getElementById('studentWelcomeTour'))return;
 const dialog=document.createElement('dialog');
 dialog.id='studentWelcomeTour';dialog.className='study-next-dialog';
 dialog.setAttribute('aria-labelledby','studentTourTitle');
 document.body.append(dialog);
 let step=0;
 const draw=()=>{
  const [title,description,,action]=tourSteps[step];
  dialog.innerHTML=`<div><h2 id="studentTourTitle">${title}</h2><p>${description}</p><div class="study-next-actions">
   <button type="button" data-tour-action="dismiss">${step===2?'Done':'Skip tour'}</button>
   ${step?'<button type="button" data-tour-action="back">Back</button>':''}
   ${step<2?'<button type="button" class="primary" data-tour-action="next">Next</button>':''}
   <button type="button" data-tour-action="open">${action}</button>
  </div><small>Step ${step+1} of ${tourSteps.length}</small></div>`;
 };
 dialog.addEventListener('click',e=>{
  const action=e.target.closest('[data-tour-action]')?.dataset.tourAction;
  if(action==='next'||action==='back'){step+=action==='next'?1:-1;draw();dialog.querySelector('[data-tour-action="next"],[data-tour-action="dismiss"]')?.focus();return}
  if(action==='dismiss'||action==='open'){
   dialog.close();
   if(action==='open'){document.getElementById('siteAdmin')?.close();go(tourSteps[step][2]);}
  }
 });
 dialog.addEventListener('close',()=>{saveOption('welcomeTourSeen',true);dialog.remove();document.getElementById('welcomeTourPrompt')?.remove();},{once:true});
 draw();dialog.showModal();
}
function tourEntry(){
 if(!options().welcomeTourSeen&&!window.reviewHasStudyEvidence?.(DATA.items)&&window.REVIEW_STUDIO_FRESH_ACCOUNTS){
  const hero=document.getElementById('homeNextAction');
  if(hero&&!document.getElementById('welcomeTourPrompt')){
   hero.insertAdjacentHTML('afterend','<div id="welcomeTourPrompt"><button type="button" class="linkbtn" data-study-tour>Take a quick tour</button> <button type="button" class="linkbtn" data-study-hide-tour>Skip tour</button></div>');
  }
 }else document.getElementById('welcomeTourPrompt')?.remove();
 const settings=document.querySelector('#siteAdmin .admin-frame');
 if(settings&&!settings.querySelector('[data-study-tour]'))settings.insertAdjacentHTML('beforeend','<button type="button" data-study-tour>Replay welcome tour</button>');
}
function firstLessonControls(){
 const main=document.querySelector('.learning-main');
 if(!main||view!=='learning'||learnTab!=='lesson')return;
 const lesson=lessonById(lessonId),guide=options().firstLessonGuide;
 const quiz=main.querySelector('#inlineTopicQuestions');
 if(!lesson||!quiz||guide!==lessonId||main.querySelector('[data-guide-try]'))return;
 const session=inlineSession(lesson),score=inlineTopicScore(lesson,session.questions,undefined,session);
 const section=main.querySelector('.guide-section,.teaching-card');
 if(section&&score.available&&score.total===0){
  section.insertAdjacentHTML('afterbegin','<div class="first-lesson-step"><button type="button" class="primary" data-guide-try>Try the questions</button></div>');
 }
 if(score.total>0&&!quiz.querySelector('#firstLessonNext')){
  const next=score.complete?(session.index+1<session.topics.length?`<button type="button" class="primary" data-inline-jump="${session.index+1}">Next topic</button>`:'<button type="button" class="primary" data-view="dashboard">Back to Home</button>'):
   '<p>Read the feedback below, then retry missed questions when you’re ready.</p>';
  quiz.querySelector('.inline-quiz-actions')?.insertAdjacentHTML('afterend','<div id="firstLessonNext">'+next+'</div>');
 }
}
document.addEventListener('click',e=>{
 const start=e.target.closest('[data-first-lesson]');
 if(start?.dataset.lesson)saveOption('firstLessonGuide',start.dataset.lesson);
 if(e.target.closest('[data-guide-try]')){
  const question=document.querySelector('#inlineTopicQuestions');
  const first=question?.querySelector('input[data-inline-question]:not(:disabled)');
  if(first)first.focus({preventScroll:true});
  question?.scrollIntoView({block:'start',behavior:'instant'});
 }
},true);
function paint(){
 if(document.documentElement.dataset.boot!=='ready')return;
 if(!document.getElementById('studySyncDetails'))window.reviewPaintSyncDetails();
 if(view==='dashboard'){resumeCard();scheduleAlerts();}
 tourEntry();firstLessonControls();
 if(view==='calendar'){
  scheduleAlerts();
  if(settings.groupConfigured&&settings.labGroupConfigured&&!settings.labGroup&&window.REVIEW_STUDIO_FRESH_ACCOUNTS)
   html('scheduleChooseLab','<p>Add your lab group to see your assigned labs. <button type="button" data-study-lab-settings>Open Site Settings</button></p>');
 }
 if(view==='planner'){planPanel();paintPlan();}
 if(view==='practice')reviewPanel();
 if(view==='learning'&&itemById(lessonId)&&document.querySelector('.guide-section,.complete-guide,.teaching-card')){
  const position=guideTopicLesson===lessonId?Number(guideTopic)||0:Number(cardIndex)||0;
  const key=lessonId+':'+position;if(paintedLesson===key)return;paintedLesson=key;
  const lesson=lessonById(lessonId),saved=options().studyNextLesson;
  if(saved?.id!==lessonId||saved.position!==position)saveOption('studyNextLesson',{id:lessonId,position,topicTitle:lesson?inlineTopicsFor(lesson)[position]?.title:'',at:new Date().toISOString()});
 }
}
const before=render;render=function(...args){const result=before.apply(this,args);paint();return result;};
window.addEventListener('review:academic-config',paint);
const actionHandlers={
 'tour':openWelcomeTour,
 'lab-settings':()=>document.getElementById('openSiteAdmin')?.click(),
 'hide-tour':()=>{saveOption('welcomeTourSeen',true);document.getElementById('welcomeTourPrompt')?.remove();},
 'sync-edit':()=>itemById(issue?.recordId)&&openEdit(issue.recordId),
 'sync-export':()=>document.getElementById('export')?.click(),
 'sync-retry':()=>document.getElementById('syncNow')?.click(),
 'build-revision':buildRevision,'add-revision':addRevision,
 'revision-topic':v=>{const t=revision?.rows[Number(v)]?.topic;if(t)return openTopic(t.lectureId,t.index);},
 'revision-practice':v=>{const q=revision?.rows[Number(v)]?.next;if(q)practiceAlternate(q);},
 'preview':()=>{const input=document.getElementById('studyNextBudget');if(!input.reportValidity())return;budget=Number(input.value)||60;preview=calculatePlan();paintPlan();},
 'apply':applyPlan,
 'complete':id=>{saveOption('requiredPlannerTasks',(options().requiredPlannerTasks||[]).map(t=>t.id===id?{...t,completedAt:new Date().toISOString()}:t));render();},
 'plan-question':async(id,button)=>{await window.reviewEnsureCourses?.([itemById(button.dataset.lecture)?.course].filter(Boolean));const q=allLearningQuestions().find(question=>question.id===id);if(q)practiceAlternate(q);},
 'plan-topic':(id,button)=>{const e=(options().requiredPlannerTasks||[]).find(t=>t.id===id)?.entries?.[Number(button.dataset.entry)];if(e)return openTopic(e.lectureId,e.index);},
 'dismiss-schedule':()=>{seenSchedule=window.reviewPublishedAcademic?.()?.revisionId;document.getElementById('studyNextSchedule')?.remove();},
 'resume':kind=>{
  const saved=options();
  if(kind==='lesson'&&saved.studyNextLesson)return openTopic(saved.studyNextLesson.id,saved.studyNextLesson.position);
  if(kind==='booklet'&&saved.studyNextBooklet)return window.reviewOpenCourse?.(saved.studyNextBooklet.course,'booklet');
  const attempt=activeAttempt();if(attempt){etPracticeTab=attempt.kind==='original'?'original':'mock';if(attempt.course&&window.reviewOpenCourse)return window.reviewOpenCourse(attempt.course,'practice');go('practice');}
 },
};
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 const marker=[...button.attributes].find(a=>a.name.startsWith('data-study-'));
 const handler=marker&&actionHandlers[marker.name.slice('data-study-'.length)];
 if(!handler)return;
 Promise.resolve().then(()=>handler(marker.value,button)).catch(()=>toast('This study tool could not finish. Please try again.'));
});
paint();

async function assessCoverage(button){
 const set=ORIGINAL_EXAMS.sets.find(s=>s.id===button.dataset.studyCoverage);if(!set)return;
 const panel=button.closest('details').querySelector('[data-study-coverage-body]');
 panel.textContent='Reading topic mappings…';
 const questions=set.ids.map(originalQuestionById).filter(Boolean),course=set.course||window.reviewCourseScope;
 await window.reviewEnsureCourses?.([course].filter(Boolean));
 const topics=topicsFor(questions),byId=new Map(),byStem=new Map();
 const norm=q=>String(q?.question||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
 for(const topic of topics)for(const q of topic.questions){byId.set(q.id,topic.title);if(norm(q))byStem.set(norm(q),topic.title);}
 const lookup=q=>byId.get(q.id)||byStem.get(norm(q))||itemById(q.lectureIds?.[0]||q.lectureId)?.title||null;
 const rows=topicCoverage(questions,lookup,allLearningQuestions());
 const completeness=set.coverage==='complete'||set.id==='ren-18-collection-ospe'&&set.ids.length===20?'Complete paper':set.coverage==='partial'||/recall|reconstruct|partial|incomplete/i.test((set.note||'')+' '+set.title)?'Partial recall':'Completeness unverified';
 panel.innerHTML='<p>'+completeness+'</p><ul>'+rows.map(row=>`<li>${esc(row.topic||'Topic not mapped')} · ${row.total} in this set${row.topic?' · '+row.available+' in practice'+(row.available<3?' · limited practice':''):''}</li>`).join('')+'</ul>';
}
// Pass the triggering control so each paper keeps its own report.
actionHandlers.coverage=(_value,button)=>assessCoverage(button);

function readinessButton(){
 const dialog=document.querySelector('#siteAdmin .admin-frame');
 if(!dialog)return;
 const existing=dialog.querySelector('[data-study-readiness]');
 if(window.reviewAdmin!==true){existing?.remove();return;}
 if(existing)return;
 const button=document.createElement('button');
 button.type='button';button.dataset.studyReadiness='';button.textContent='Course readiness preview';dialog.append(button);
}
window.addEventListener('review-admin-role',readinessButton);
document.addEventListener('click',e=>{if(e.target.closest('#openSiteAdmin'))queueMicrotask(readinessButton);});
readinessButton();
async function readinessPreview(){
 if(window.reviewAdmin!==true||document.getElementById('studyReadiness'))return;
 const {courseInventory,unavailableAssets}=await import('./study-course-readiness.mjs');
 if(window.reviewAdmin!==true||document.getElementById('studyReadiness'))return;
 const dialog=document.createElement('dialog');dialog.id='studyReadiness';dialog.className='study-next-dialog';
 dialog.innerHTML=`<form method="dialog"><h2>Course readiness preview</h2><label>Course <select>${Object.entries(courses).map(([id,c])=>`<option value="${id}" ${id==='REN'?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label><div role="status"></div><button>Close</button></form>`;
 const picker=dialog.querySelector('select'),status=dialog.querySelector('[role=status]');
 const read=async url=>{const response=await fetch(url);if(!response.ok)throw Error(url);return response.json();};
 let generation=0;
 async function inspect(){
  const run=++generation,course=picker.value,config=courses[course];status.textContent='Checking course resources…';
  const loaded=await Promise.allSettled([window.reviewEnsureCourses?.([course]),read('/group-timetables.json'),read('/lab-curriculum.json'),
   course==='REN'?import('./renal-ospe.mjs').then(m=>m.loadRenalOspe()):config.noOspe?Promise.resolve(null):read('/ospe-curriculum.json'),
   config.assessmentPath?read('/api/site-assets/'+config.assessmentPath):Promise.resolve({sets:ORIGINAL_EXAMS.sets}),]);
  const data=loaded.map(x=>x.value);
  const lessons=DATA.items.filter(item=>item.course===course),ids=new Set(lessons.map(l=>l.id));
  const labs=data[2]?.modules?.filter(m=>m.course===course)||[];
  if(course==='REN'&&loaded[0].status==='fulfilled'){
   const module=await import('./renal-labs.mjs');labs.push(...module.renalLabs(TEACHING.guides,LEARNING.questions).modules);
  }
  const stations=data[3]?.stations||[];
  const questions=data[4]?.questions||[],figures=[
   ...stations.flatMap(s=>[s.figure,...(s.figures||[]).map(f=>f.image)]),
   ...questions.flatMap(q=>(q.figures||[]).map(f=>f.image)),
   ...labs.flatMap(l=>(l.topics||[]).flatMap(t=>[t.figure?.image,...(t.questions||[]).map(q=>q.figure?.image)])),
  ].filter(Boolean);
  const missingFigures=stations.filter(s=>!s.figure&&!s.figures?.length).length;
  const figurePaths=figures.filter(path=>!path.startsWith('data:image/'));
  const sources=LEARNING.sources.filter(s=>ids.has(s.lectureId)||s.lectureIds?.some(id=>ids.has(id))).map(s=>s.url).filter(url=>url?.startsWith('/api/'));
  const bookletUrl={CVP:'/cvp19-booklet.json',MOL:'/api/site-assets/materials/mol114/interactive-booklet.json',REN:'/api/site-assets/materials/ren123/interactive-booklet-v2.json'}[course];
  const checked=await unavailableAssets([...sources,...figurePaths,...(bookletUrl?[bookletUrl]:[])]);
  if(run!==generation||!dialog.open)return;
  const inventory=courseInventory(course,{lessons,events:data[1]?.events?.filter(e=>e.course===course)||[],labs,stations,figures:figurePaths,sources,
   assessments:data[4]?.sets?.filter(s=>s.course===course||s.ids?.[0]?.includes(course.toLowerCase()))||[],booklet:bookletUrl&&!checked.includes(bookletUrl)});
  status.innerHTML='<ul>'+inventory.rows.map(row=>`<li>${esc(row.label)} · ${row.count===null?'Not offered':row.count||'Needs resources'} <button type="button" data-study-surface="${row.view}" ${row.count===null?'disabled':''}>Preview</button></li>`).join('')+'</ul>'+
   (inventory.unregistered.length?'<p>Unregistered lecture IDs: '+esc(inventory.unregistered.join(', '))+'</p>':'')+
   (inventory.missing.length?'<p>Missing routes: '+esc(inventory.missing.join(', '))+'</p>':'')+
   (loaded.some(x=>x.status==='rejected')?'<p>One or more course banks could not be opened.</p>':'')+
   (missingFigures?'<p>'+missingFigures+' OSPE stations have no figure.</p>':'')+
   (checked.length?'<details open><summary>'+checked.length+' missing or unreachable assets</summary><ul>'+checked.map(path=>'<li>'+esc(path)+'</li>').join('')+'</ul></details>':'<p>Checked source and figure links are reachable.</p>');
 }
 const run=()=>inspect().catch(()=>{status.textContent='The readiness check could not finish.';});
 dialog.addEventListener('click',e=>{
  const target=e.target.closest('[data-study-surface]');if(!target)return;
  const route=target.dataset.studySurface,course=picker.value;
  dialog.close();document.getElementById('siteAdmin')?.close();
  if(route==='calendar'){go('calendar');return;}
  if(route==='practice')etPracticeTab='original';
  window.reviewOpenCourse?.(course,route);
 });
 picker.onchange=run;dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 document.body.append(dialog);dialog.showModal();run();
}
actionHandlers.readiness=readinessPreview;

const deviceTiming=()=>{
 const navigation=performance.getEntriesByType('navigation')[0];
 const mark=performance.getEntriesByName('studio-home-usable').at(-1);
 if(!mark||!navigation)return;
 const safari=/iPhone/.test(navigator.userAgent)&&/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
 const host=document.querySelector('#siteAdmin .admin-frame');if(!host||host.querySelector('#studyHomeTiming'))return;
 const note=document.createElement('small');note.id='studyHomeTiming';
 note.textContent=(safari?'iPhone Safari':'This browser')+' · Home usable in '+(mark.startTime/1000).toFixed(2)+' s';host.append(note);
};
document.addEventListener('click',e=>{if(e.target.closest('#openSiteAdmin'))queueMicrotask(deviceTiming);});
