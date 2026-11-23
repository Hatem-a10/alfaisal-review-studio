/* global DATA, GroupSchedules, campusTime, campusWeekEvents, officialGroupSchedule, groupScheduleError, groupTimetableReady, settings, tasks, go, view, render, lessonId, lessonCourse:writable, learnTab:writable, etExam, originalRun, etScope:writable, etMockScope:writable, etAccurate:writable, etLecture, esc, intro, today, libraryTab:writable, applyTheme, paintProfile */
import {archiveViews,renalViews,renalSessions,workspaceRoute} from './course-workspace-core.mjs';
import {bookletSections,renalGuides} from './renal-study.mjs';

const labels={dashboard:'Overview',learning:'Lessons',booklet:'Booklets',practice:'Practice & exams',labs:'Labs',ospe:'OSPE',library:'Materials'};
const scopedViews=new Set(['learning','practice','library','labs']);
const enabled=()=>window.REVIEW_STUDIO_FRESH_ACCOUNTS===true&&window.reviewManagedFlags?.archiveCvp!==false;
const legacyGo=go,legacyRender=render;
window.reviewCvpArchived=enabled;
window.reviewActiveStudyItems=()=>enabled()?DATA.items.filter(item=>item.course!=='CVP'):DATA.items;
let context=null,materials=[],materialsPending,materialError='';
function loadMaterials(){
 if(materials.length||materialsPending)return;
 materialsPending=fetch('/renal-materials.json',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error('The Renal source catalog could not load.');
  return response.json();
 }).then(rows=>{materials=rows;materialError='';}).catch(error=>{materialError=error.message;}).finally(()=>{
  materialsPending=null;
  if(context?.course==='REN')render();
 });
}
function assetLink(source,label,page){
 if(!source)return '';
 const suffix=page&&source.path.endsWith('.pdf')?'#page='+page:'';
 return '<a class="material-action" href="/api/site-assets/'+esc(source.path)+suffix+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>';
}
function materialList(kinds){
 const items=materials.filter(source=>kinds.includes(source.kind));
 if(!items.length)return '';
 return '<ul class="course-workspace-sessions">'+items.map(source=>'<li><strong>'+esc(source.title)+'</strong><small>'+source.units+' '+(source.path.endsWith('.pdf')?'pages':'slides')+' · '+assetLink(source,source.path.endsWith('.pdf')?'Open PDF':'Download slides')+'</small></li>').join('')+'</ul>';
}
function bookletList(types){
 const booklet=materials.find(source=>source.kind==='booklet');
 if(!booklet)return '';
 return '<p>'+assetLink(booklet,'Open full booklet')+' · '+assetLink(booklet,'Contents',2)+'</p>'+
  '<p>Recalled papers. Original figures and printed answers appear on the source pages.</p>'+
  bookletSections.filter(([kind])=>types.includes(kind)).map(([kind,sections])=>'<details class="renal-source-index" '+(types.length===1?'open':'')+'><summary>'+kind+'</summary><ul class="course-workspace-sessions">'+sections.map(([label,page])=>'<li>'+assetLink(booklet,label+' · p. '+page,page)+'</li>').join('')+'</ul></details>').join('');
}
function guideList({practiceOnly=false}={}){
 return renalGuides.map(guide=>{
  const source=materials.find(source=>source.id===guide.source);
  if(!source)return '';
  return '<details class="panel renal-guide"><summary><strong>'+guide.code+' · '+esc(source.title)+'</strong></summary>'+
   assetLink(source,source.path.endsWith('.pdf')?'Open original lecture':'Download original lecture')+
   guide.topics.map(topic=>'<article><h3>'+esc(topic.title)+'</h3>'+(practiceOnly?'':'<p>'+esc(topic.text)+'</p>')+
    '<p><strong>'+esc(topic.question)+'</strong></p><details><summary>Check answer</summary><p>'+esc(topic.answer)+'</p></details>'+
    '<small>'+assetLink(source,(source.path.endsWith('.pdf')?'Source page ':'Source slide ')+topic.page,topic.page)+'</small></article>').join('')+'</details>';
 }).join('');
}

const courseButton=(course,route,label)=>'<button type="button" data-workspace="'+course+'/'+route+'">'+esc(label)+'</button>';
const archiveLink=()=>courseButton('archive','index','CVP archive');
const renalLink=route=>courseButton('renal',route,'REN 123');
function mountNavigation(){
 for(const navigation of document.querySelectorAll('#mainSidebar nav,.ui-mobile-nav')){
  let archive=navigation.querySelector('[data-view="archive"]');
  if(enabled()&&!archive){
   archive=document.createElement('button');
   archive.type='button';
   archive.dataset.view='archive';
   archive.innerHTML='<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 13h6"/></svg><span>Archive</span>';
   navigation.append(archive);
  }
  if(archive){
   archive.hidden=!enabled();
   archive.classList.toggle('active',enabled()&&context?.course==='CVP');
  }
  const booklet=navigation.querySelector('[data-view="booklet"] span');
  if(booklet)booklet.textContent=enabled()?'Booklets':'Booklet';
 }
}
function archiveIndex(){
 return intro('CVP 112','Course archive','')+
  '<section class="panel"><h2>Cardiovascular & Respiratory</h2><div class="course-workspace-links">'+
  archiveViews.map(route=>courseButton('archive',route,labels[route])).join('')+'</div></section>';
}
function time(event){return esc(campusTime(event.start)+' – '+campusTime(event.end));}
function renalPage(route){
 if(route!=='dashboard'&&!materials.length&&!materialError)loadMaterials();
 const groups={...settings,...window.reviewManagedAssignment};
 const profile=GroupSchedules.profile(groups);
 const events=officialGroupSchedule?.events||[];
 const matches=event=>!profile.group||GroupSchedules.assigned(event,groups);
 const lectureKinds=['anatomy','physiology'];
 const exams=DATA.events.filter(event=>event.course==='REN'&&['final','ospe'].includes(event.kind));
 const links=[['learning','Lessons'],['practice','Practice'],['booklet','Booklets'],['labs','Labs'],['ospe','OSPE'],['library','Materials']];
 let body='';
 if(route==='dashboard'){
  const next=events.find(event=>event.course==='REN'&&event.date>=today()&&['anatomy','physiology','lab'].includes(event.kind)&&matches(event));
  body='<section class="panel"><h2>Renal Block I</h2><div class="course-workspace-links">'+links.map(([id,label])=>courseButton('renal',id,label)).join('')+
   '<button data-view="calendar">Schedule</button><button data-view="countdowns">Countdowns</button><button data-view="planner">Study planner</button>'+archiveLink()+'</div>'+
   (next?'<p>Next on your timetable · '+esc(next.title)+' '+esc(next.detail)+' · '+esc(next.date)+' · '+time(next)+'</p>':'')+
   exams.map(event=>'<p>'+esc(event.title)+' · '+esc(event.date)+' · '+esc(event.detail)+'</p>').join('')+'</section>';
 }else if(route==='learning'||route==='labs'){
  const rows=renalSessions(events,matches,route==='learning'?lectureKinds:['lab']);
  body=route==='learning'?guideList():'<section class="panel"><h2>Lab handouts</h2>'+materialList(['lab'])+'</section>';
  body+='<details class="panel"><summary>'+labels[route]+' on the official timetable</summary>'+
   (rows.length?'<ul class="course-workspace-sessions">'+rows.map(event=>{
    const source=route==='learning'&&materials.find(source=>source.sessions.includes(event.title));
    return '<li><strong>'+esc(event.title)+'</strong>'+ (event.detail?' · '+esc(event.detail):'')+
     '<small>'+esc(event.date)+' · '+time(event)+(source?' · '+assetLink(source,'Course source'):'')+'</small></li>';
   }).join('')+'</ul>':'<p role="status">'+(officialGroupSchedule?'No matching sessions.':groupScheduleError||'Loading timetable…')+'</p>')+'</details>';
 }else if(route==='ospe'){
  body='<section class="panel"><h2>Renal OSPE</h2>'+exams.filter(e=>e.kind==='ospe').map(e=>'<p>'+esc(e.date)+' · '+esc(e.detail)+'</p>').join('')+
   bookletList(['OSPE'])+'</section>';
 }else if(route==='practice'){
  body='<section class="panel"><h2>Original practice</h2>'+bookletList(['MCQs','SAQs'])+'</section>'+guideList({practiceOnly:true});
 }else if(route==='booklet'){
  body='<section class="panel"><h2>Renal past questions</h2>'+bookletList(['MCQs','SAQs','OSPE'])+'</section>';
 }else if(route==='library'){
  body='<section class="panel"><h2>Course information</h2>'+materialList(['overview'])+'</section>'+
   '<section class="panel"><h2>Lectures, labs and past questions</h2>'+materialList(['lecture','lab','booklet'])+'</section>';
 }
 if(!materials.length&&route!=='dashboard')body+='<p role="status">'+esc(materialError||'Loading Renal sources…')+'</p>'+
  (materialError?'<button type="button" data-renal-retry>Retry sources</button>':'');
 const other=scopedViews.has(route)?courseButton('mol',route,'MOL 114 '+labels[route].toLowerCase()):'';
 return intro('CURRENT COURSE','REN 123 · Renal','')+'<div class="course-workspace-links">'+renalLink('dashboard')+other+'</div>'+body;
}
function show(route){
 context=route;
 window.reviewCourseScope=route?.course==='MOL'||route?.course==='CVP'?route.course:null;
 if(route?.course==='CVP'&&route.view==='index'){view='dashboard';return;}
 if(route?.course==='REN'){view=route.view;return;}
 if(route){
  view=route.view;
  if(view==='learning'){
   lessonCourse=route.course;
   if(!lessonId.startsWith(route.course+'-')){lessonId=DATA.items.find(item=>item.course===route.course)?.id||lessonId;learnTab='lesson';}
  }
  if(view==='practice'&&!((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))){
   etScope=etMockScope=route.course;
   if(!etLecture.startsWith(route.course+'-'))etLecture=DATA.items.find(item=>item.course===route.course)?.id||etLecture;
   if(route.course==='MOL')etAccurate=false;
  }
  if(view==='library')libraryTab='documents';
 }
}
function open(course,route){
 const hash=course==='archive'&&route==='index'?'#archive':'#'+course+'/'+route;
 const next=workspaceRoute(hash);
 if(!enabled()||!next)return;
 if(location.hash!==hash)history.pushState(null,'',hash);
 show(next);
 render();
}
const beforeTasks=tasks;
tasks=function(items=DATA.items){return beforeTasks(enabled()?items.filter(item=>item.course!=='CVP'):items);};
const previousWeek=campusWeekEvents;
campusWeekEvents=function(...args){
 const events=previousWeek(...args);
 return enabled()?events.filter(event=>event.course!=='CVP'&&!/\bCVP\b/i.test(event.title||'')):events;
};

go=function(next){
 if(!enabled()){show(null);return legacyGo(next);}
 if(next==='archive')return open('archive','index');
 if(context?.course==='CVP'&&['labs','ospe'].includes(next))return open('archive',next);
 if(context?.course==='MOL'&&next==='labs')return open('mol','labs');
 if(next==='practice'&&((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))){
  show(null);return legacyGo(next);
 }
 if(next==='learning'&&view==='learning'&&context&&lessonId.startsWith(context.course+'-'))return render();
 if(renalViews.includes(next))return open('renal',next);
 show(null);
 return legacyGo(next);
};
const selectLesson=window.chooseLesson;
window.chooseLesson=function(id,...args){
 if(!enabled())return selectLesson(id,...args);
 const course=id.startsWith('CVP-')?'archive':id.startsWith('MOL-')?'mol':null;
 if(!course)return selectLesson(id,...args);
 const hash='#'+course+'/learning';
 if(location.hash!==hash)history.pushState(null,'',hash);
 show(workspaceRoute(hash));
 return selectLesson(id,...args);
};
function restore(){
 const route=enabled()?workspaceRoute(location.hash):null;
 show(route);
 if(enabled()&&!route&&renalViews.includes(view)&&!(view==='practice'&&((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))))show({course:'REN',view});
}
function highlight(){
 for(const button of document.querySelectorAll('nav button[data-view]'))button.classList.toggle('active',button.dataset.view===(context?.course==='CVP'?'archive':view));
}
render=function(...args){
 if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return legacyRender(...args);
 if(!enabled())show(null);
 const content=document.getElementById('content');
 if(enabled()&&!context&&renalViews.includes(view)&&!(view==='practice'&&((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))))show({course:'REN',view});
 document.body.classList.toggle('cvp-archive-view',enabled()&&context?.course==='CVP');
 if(context?.course==='REN'||context?.view==='index'){
  applyTheme();
  paintProfile();
  document.body.classList.remove('schedule-expanded');
  content.innerHTML=context.course==='REN'?renalPage(context.view):archiveIndex();
  mountNavigation();highlight();
  return;
 }
 const value=legacyRender(...args);
 if(context&&(context.course==='CVP'||context.course==='MOL')&&!document.getElementById('xpExam')){
  content.insertAdjacentHTML('afterbegin','<div class="course-workspace-links course-workspace-back">'+
   (context.course==='CVP'?archiveLink():renalLink(context.view))+'</div>');
 }
 mountNavigation();
 if(context)highlight();
 return value;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-workspace]');
 if(button)open(...button.dataset.workspace.split('/'));
 if(event.target.closest('[data-renal-retry]')){materialError='';loadMaterials();render();}
});
for(const event of ['hashchange','popstate'])window.addEventListener(event,()=>{restore();render();});
window.addEventListener('review-course-controls',()=>{restore();render();});
groupTimetableReady.then(()=>{if(context?.course==='REN')render();});
restore();
