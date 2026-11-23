/* global DATA, GroupSchedules, campusTime, campusWeekEvents, officialGroupSchedule, groupScheduleError, groupTimetableReady, settings, tasks, go, view, render, lessonId, lessonCourse:writable, learnTab:writable, etExam, originalRun, etScope:writable, etMockScope:writable, etAccurate:writable, etLecture, esc, intro, today, libraryTab:writable, applyTheme, paintProfile */
import {archiveViews,renalViews,renalSessions,workspaceRoute,isCvpStudyItem} from './course-workspace-core.mjs';
import {bookletSections} from './renal-study.mjs';
import {renalTeachingPack} from './renal-lessons.mjs';

const labels={dashboard:'Overview',learning:'Lessons',booklet:'Booklets',practice:'Practice & exams',labs:'Labs',ospe:'OSPE',library:'Materials'};
const scopedViews=new Set(['practice','library','labs','booklet','ospe']);
const enabled=()=>window.REVIEW_STUDIO_FRESH_ACCOUNTS===true;
const archiveEnabled=()=>enabled()&&window.reviewManagedFlags?.archiveCvp===true;
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
window.reviewArchiveEnabled=archiveEnabled;
window.reviewViewingArchive=()=>context?.course==='CVP';
window.reviewBookletCourse=()=>context?.view==='booklet'?context.course:enabled()?'REN':'CVP';
window.reviewStudyItemVisible=item=>!enabled()||(context?.course==='CVP'?isCvpStudyItem(item):!isCvpStudyItem(item));
window.reviewArchivedStudyItem=item=>enabled()&&(isCvpStudyItem(item)||item?.questions?.some(isCvpStudyItem)===true);
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
 return '<ul class="course-workspace-sessions">'+items.map(source=>'<li><strong>'+esc(source.title)+'</strong><small>'+source.units+' '+(source.path.endsWith('.pptx')?'slides':'pages')+' · '+assetLink(source,source.path.endsWith('.pdf')?'Open PDF':source.path.endsWith('.docx')?'Open handout':'Download slides')+'</small></li>').join('')+'</ul>';
}
function bookletList(types){
 const booklet=materials.find(source=>source.kind==='booklet');
 if(!booklet)return '';
 return '<p>'+assetLink(booklet,'Open full booklet')+' · '+assetLink(booklet,'Contents',2)+'</p>'+
  '<p>Recalled papers. Original figures and printed answers appear on the source pages.</p>'+
  bookletSections.filter(([kind])=>types.includes(kind)).map(([kind,sections])=>'<details class="renal-source-index" '+(types.length===1?'open':'')+'><summary>'+kind+'</summary><ul class="course-workspace-sessions">'+sections.map(([label,page])=>'<li>'+assetLink(booklet,label+' · p. '+page,page)+'</li>').join('')+'</ul></details>').join('');
}
function courseSelector(route){
 if(!scopedViews.has(route)||route==='practice'&&document.querySelector('#etMockScope,#etScope'))return '';
 const active=context?.course||'REN';
 const options=active==='CVP'?[['CVP','CVP 112 · Archive']]:
  [['REN','REN 123'],...(['booklet','practice','library','labs'].includes(route)?[['MOL','MOL 114']]:[])];
 return '<label class="workspace-course-select">Course <select aria-label="Course" data-workspace-course="'+route+'">'+options.map(([key,label])=>
  '<option value="'+key+'" '+(key===active?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
}

const courseButton=(course,route,label)=>'<button type="button" data-workspace="'+course+'/'+route+'">'+esc(label)+'</button>';
const archiveLink=()=>courseButton('archive','index','CVP archive');
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
 if(!next||next.course==='CVP'&&!archiveEnabled()||!window.REVIEW_STUDIO_FRESH_ACCOUNTS)return;
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
 if(next==='practice'&&((etExam&&!etExam.finishedAt&&!window.reviewArchivedStudyItem(etExam))||(originalRun&&!originalRun.finishedAt&&!window.reviewArchivedStudyItem(ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId))))){
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
 if(id.startsWith('CVP-')&&(!archiveEnabled()||context?.course!=='CVP'))return;
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
 let route=enabled()?workspaceRoute(location.hash):null;
 if(route?.course==='CVP'&&!archiveEnabled()){
  route=null;view='dashboard';if(window.reviewManagedFlags?.archiveCvp===false)history.replaceState(null,'','#dashboard');
 }
 show(route);
 if(enabled()&&!route&&view!=='dashboard'&&renalViews.includes(view))show({course:'REN',view});
}
function highlight(){
 const current=context?.course==='CVP'?'other':view;
 for(const button of document.querySelectorAll('#mainSidebar nav button[data-view],.ui-mobile-nav button[data-view]')){
  button.classList.toggle('active',button.dataset.view===current);
 }
}
render=function(...args){
 if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return legacyRender(...args);
 if(!enabled())show(null);
 const content=document.getElementById('content');
 if(enabled()&&!context&&view!=='dashboard'&&renalViews.includes(view))show({course:'REN',view});
 document.body.classList.toggle('cvp-archive-view',enabled()&&context?.course==='CVP');
 if((context?.course==='REN'&&!['practice','booklet','learning'].includes(context.view))||context?.view==='index'){
  applyTheme();
  paintProfile();
  document.body.classList.remove('schedule-expanded');
  content.innerHTML=context.course==='REN'?renalPage(context.view):archiveIndex();
  highlight();window.mountOtherTools?.();
  return;
 }
 const value=legacyRender(...args);
 if(context&&(context.course==='CVP'||context.course==='MOL')&&!document.getElementById('xpExam')){
  content.insertAdjacentHTML('afterbegin',courseSelector(context.view)+(context.course==='CVP'?'<div class="course-workspace-links course-workspace-back">'+archiveLink()+'</div>':''));
 }
 if(context?.course==='REN'&&['booklet','practice'].includes(view)&&!document.getElementById('xpExam'))content.insertAdjacentHTML('afterbegin',courseSelector(view));
 if(context){highlight();window.mountOtherTools?.();}
 return value;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-workspace]');
 if(button)open(...button.dataset.workspace.split('/'));
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
