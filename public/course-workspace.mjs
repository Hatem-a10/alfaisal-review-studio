/* global DATA, GroupSchedules, campusTime, campusWeekEvents, officialGroupSchedule, groupScheduleError, groupTimetableReady, settings, tasks, go, view, render, lessonId, lessonCourse:writable, learnTab:writable, etExam, originalRun, etScope:writable, etMockScope:writable, etAccurate:writable, etLecture, esc, intro, today, libraryTab:writable, applyTheme, paintProfile */
import {archiveViews,renalViews,renalSessions,workspaceRoute} from './course-workspace-core.mjs';
import {bookletSections} from './renal-study.mjs';
import {renalTeachingPack} from './renal-lessons.mjs';

const labels={dashboard:'Overview',learning:'Lessons',booklet:'Booklets',practice:'Practice & exams',labs:'Labs',ospe:'OSPE',library:'Materials'};
const scopedViews=new Set(['practice','library','labs','booklet','ospe']);
const enabled=()=>window.REVIEW_STUDIO_FRESH_ACCOUNTS===true&&window.reviewManagedFlags?.archiveCvp!==false;
const legacyGo=go,legacyRender=render;
const renalTeaching=renalTeachingPack();
if(window.REVIEW_STUDIO_FRESH_ACCOUNTS){
 DATA.items.push(...renalTeaching.items);
 LEARNING.lessons.push(...renalTeaching.lessons);
 LEARNING.sources.push(...renalTeaching.sources);
 LEARNING.questions.push(...renalTeaching.questions);
 Object.assign(TEACHING.guides,renalTeaching.guides);
}
window.reviewCvpArchived=enabled;
window.reviewBookletCourse=()=>context?.course==='REN'?'REN':'CVP';
window.reviewRenalOriginalWorkspace=()=>{
 if(!materials.length&&!materialError)loadMaterials();
 return '<section class="panel"><h2>Previous exams · REN 123</h2>'+bookletList(['MCQs','SAQs','OSPE'])+'</section>';
};
const hasReviewDates=item=>item.course!=='REN'||dates(item).some(Boolean);
window.reviewActiveStudyItems=()=>DATA.items.filter(item=>hasReviewDates(item)&&(!enabled()||item.course!=='CVP'));
let context=null,renalLessonId='REN-A1',lastMOLLesson='MOL-1',materials=[],materialsPending,materialError='';
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
function renalCatalog(){
 const topics=new Map(renalSessions(officialGroupSchedule?.events||[],()=>true,['anatomy','physiology'])
  .filter(event=>/^[AP]\d+$/.test(event.title)).map(event=>[event.title,event.detail?.replace(/ ?\([^)]+\)$/, '')||event.title]));
 for(const item of renalTeaching.items)topics.set(item.code,item.title);
 return [...topics].filter(([code])=>!renalTeaching.guides['REN-'+code]).map(([code,title])=>({code,id:'REN-'+code,title,chosen:context?.course==='REN'&&renalLessonId==='REN-'+code}));
}
if(window.REVIEW_STUDIO_FRESH_ACCOUNTS)window.reviewRenalCatalog=()=>enabled()?renalCatalog():[];
function renalUnreleasedLesson(){
 const item=renalCatalog().find(item=>item.id===renalLessonId);
 return learningAreaTabs('learning')+'<div class="learning-layout">'+lessonCatalog()+
  '<div class="learning-main"><section class="panel learning-heading"><div><span class="pill">'+esc(item?.code||'REN 123')+'</span><h2>'+esc(item?.title||'Renal lessons')+'</h2></div></section>'+
  '<p class="panel">Lecture source pending.</p></div></div>';
}
function courseSelector(route){
 if(!scopedViews.has(route)||route==='practice'&&document.querySelector('#etMockScope,#etScope'))return '';
 const active=context?.course||'REN';
 const options=[['REN','REN 123'],...(['practice','library','labs'].includes(route)?[['MOL','MOL 114']]:[]),
  ...(route==='booklet'||route==='ospe'||active==='CVP'?[['CVP',enabled()?'CVP 112 · Archive':'CVP 112']]:[])];
 return '<label class="workspace-course-select">Course <select aria-label="Course" data-workspace-course="'+route+'">'+options.map(([key,label])=>
  '<option value="'+key+'" '+(key===active?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
}

const courseButton=(course,route,label)=>'<button type="button" data-workspace="'+course+'/'+route+'">'+esc(label)+'</button>';
const archiveLink=()=>courseButton('archive','index','CVP archive');
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
 const exams=DATA.events.filter(event=>event.course==='REN'&&['final','ospe'].includes(event.kind));
 let body='';
 if(route==='labs'){
  const rows=renalSessions(events,matches,['lab']);
  body='<section class="panel"><h2>Lab handouts</h2>'+materialList(['lab'])+'</section>';
  body+='<details class="panel"><summary>'+labels[route]+' on the official timetable</summary>'+
   (rows.length?'<ul class="course-workspace-sessions">'+rows.map(event=>{
    return '<li><strong>'+esc(event.title)+'</strong>'+ (event.detail?' · '+esc(event.detail):'')+
     '<small>'+esc(event.date)+' · '+time(event)+'</small></li>';
   }).join('')+'</ul>':'<p role="status">'+(officialGroupSchedule?'No matching sessions.':groupScheduleError||'Loading timetable…')+'</p>')+'</details>';
 }else if(route==='ospe'){
  body='<section class="panel"><h2>Renal OSPE</h2>'+exams.filter(e=>e.kind==='ospe').map(e=>'<p>'+esc(e.date)+' · '+esc(e.detail)+'</p>').join('')+
   bookletList(['OSPE'])+'</section>';
 }else if(route==='library'){
  body='<section class="panel"><h2>Course information</h2>'+materialList(['overview'])+'</section>'+
   '<section class="panel"><h2>Lectures, labs and past questions</h2>'+materialList(['lecture','lab','booklet'])+'</section>';
 }
 if(!materials.length&&route!=='dashboard')body+='<p role="status">'+esc(materialError||'Loading Renal sources…')+'</p>'+
  (materialError?'<button type="button" data-renal-retry>Retry sources</button>':'');
 const header=['labs','ospe'].includes(route)?learningAreaTabs(route):intro('',labels[route]||'REN 123','');
 return header+courseSelector(route)+body;
}
function show(route){
 context=route;
 window.reviewCourseScope=route?.course==='CVP'||(route?.course==='MOL'&&route.view!=='learning')||(route?.course==='REN'&&route.view==='practice')?route.course:null;
 if(route?.view==='dashboard'&&route.course==='REN'){context=null;view='dashboard';return;}
 if(route?.course==='CVP'&&route.view==='index'){view='dashboard';return;}
 if(route?.course==='REN'){
  view=route.view;
  if(view==='learning'){lessonCourse='REN';if(renalTeaching.guides[renalLessonId])lessonId=renalLessonId;}
  if(view==='practice'&&!((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))){etScope=etMockScope='REN';etAccurate=false;}
  return;
 }
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
 if(!next||next.course==='CVP'&&!enabled()||!window.REVIEW_STUDIO_FRESH_ACCOUNTS)return;
 if(location.hash!==hash)history.pushState(null,'',hash);
 show(next);
 render();
}
const beforeTasks=tasks;
tasks=function(items=DATA.items){return beforeTasks(items.filter(item=>hasReviewDates(item)&&(!enabled()||item.course!=='CVP')));};
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
 if(next!=='dashboard'&&renalViews.includes(next))return open('renal',next);
 show(null);
 return legacyGo(next);
};
const selectLesson=window.chooseLesson;
window.chooseLesson=function(id,...args){
 if(!enabled())return selectLesson(id,...args);
 if(renalTeaching.guides[id]){
  const filter=lessonCourse;
  renalLessonId=id;
  if(location.hash!=='#renal/learning')history.pushState(null,'','#renal/learning');
  show({course:'REN',view:'learning'});
  if(filter==='all')lessonCourse='all';
  return selectLesson(id,...args);
 }
 if(id.startsWith('MOL-'))lastMOLLesson=id;
 const course=id.startsWith('CVP-')?'archive':id.startsWith('MOL-')?'mol':null;
 if(!course)return selectLesson(id,...args);
 const preserve=course==='mol'&&lessonCourse==='all';
 const hash='#'+course+'/learning';
 if(location.hash!==hash)history.pushState(null,'',hash);
 show(workspaceRoute(hash));
 if(preserve)lessonCourse='all';
 return selectLesson(id,...args);
};
function restore(){
 const route=enabled()?workspaceRoute(location.hash):null;
 show(route);
 if(enabled()&&!route&&view!=='dashboard'&&renalViews.includes(view)&&!(view==='practice'&&((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))))show({course:'REN',view});
}
function highlight(){
 for(const button of document.querySelectorAll('nav button[data-view]'))button.classList.toggle('active',button.dataset.view===(context?.course==='CVP'?'archive':view));
}
render=function(...args){
 if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return legacyRender(...args);
 if(!enabled())show(null);
 const content=document.getElementById('content');
 if(enabled()&&!context&&view!=='dashboard'&&renalViews.includes(view)&&!(view==='practice'&&((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))))show({course:'REN',view});
 document.body.classList.toggle('cvp-archive-view',enabled()&&context?.course==='CVP');
 if((context?.course==='REN'&&!['practice','booklet'].includes(context.view)&&(context.view!=='learning'||!renalTeaching.guides[renalLessonId]))||context?.view==='index'){
  applyTheme();
  paintProfile();
  document.body.classList.remove('schedule-expanded');
  content.innerHTML=context.course==='REN'?(context.view==='learning'?renalUnreleasedLesson():renalPage(context.view)):archiveIndex();
  mountNavigation();highlight();
  return;
 }
 const value=legacyRender(...args);
 if(context&&(context.course==='CVP'||context.course==='MOL')&&!document.getElementById('xpExam')){
  content.insertAdjacentHTML('afterbegin',courseSelector(context.view)+(context.course==='CVP'?'<div class="course-workspace-links course-workspace-back">'+archiveLink()+'</div>':''));
 }
 if(context?.course==='REN'&&['booklet','practice'].includes(view)&&!document.getElementById('xpExam'))content.insertAdjacentHTML('afterbegin',courseSelector(view));
 mountNavigation();
 if(context)highlight();
 return value;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-workspace]');
 if(button)open(...button.dataset.workspace.split('/'));
 const renal=event.target.closest('[data-renal-lesson]');
 if(renal){
  const filter=lessonCourse;
  renalLessonId=renal.dataset.renalLesson;
  if(context?.course!=='REN')show({course:'REN',view:'learning'});
  if(filter==='all')lessonCourse='all';
  history.replaceState(null,'','#renal/learning');
  render();
 }
 if(event.target.closest('[data-renal-retry]')){materialError='';loadMaterials();render();}
});
document.addEventListener('change',event=>{
 const target=event.target;
 if(enabled()&&['etMockScope','etScope'].includes(target.id)&&['REN','MOL'].includes(target.value)&&(target.value!==context?.course)){
  open(target.value==='REN'?'renal':'mol','practice');
 }
 if(target.matches('[data-workspace-course]')){
  const course={REN:'renal',MOL:'mol',CVP:'archive'}[target.value];
  if(course)open(course,target.dataset.workspaceCourse);
 }
 if(!enabled()||target.id!=='lessonCourse'||context?.course==='CVP')return;
 event.stopImmediatePropagation();
 const filter=target.value;
 if(filter==='REN')open('renal','learning');
 else if(filter==='all'&&context?.course==='REN'){lessonCourse=filter;render();}
 else{
  if(context?.course==='REN')show({course:'MOL',view:'learning'});
  lessonId=lessonId.startsWith('MOL-')?lessonId:lastMOLLesson;
  lessonCourse=filter;
  history.replaceState(null,'','#mol/learning');
  render();
 }
},true);
for(const event of ['hashchange','popstate'])window.addEventListener(event,()=>{restore();render();});
window.addEventListener('review-course-controls',()=>{restore();render();});
groupTimetableReady.then(()=>{if(context?.course==='REN')render();});
restore();
