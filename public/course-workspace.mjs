/* global DATA, campusWeekEvents, tasks, go, view, render, lessonId, lessonCourse:writable, learnTab:writable, etExam, originalRun, etScope:writable, etMockScope:writable, etAccurate:writable, etLecture, esc, intro, libraryTab:writable, documentId:writable, sourceSearch:writable, sourceLecture:writable, applyTheme, paintProfile */
import {archiveViews,renalViews,workspaceRoute,isCvpStudyItem} from './course-workspace-core.mjs';
import {courses} from './course-registry.mjs';
import {renalTeachingPack} from './renal-lessons.mjs';

const labels={dashboard:'Overview',learning:'Lessons',booklet:'Booklets',practice:'Practice & exams',labs:'Labs',ospe:'OSPE',library:'Materials'};
// A5-133: immutable course registry order is stable; compute it once, not on every selector render.
const registryCourseEntries=Object.entries(courses);
const orderedCourses=registryCourseEntries.slice().sort(([a],[b])=>Number(b==='REN')-Number(a==='REN'));
const activeCourseEntries=orderedCourses.filter(([,c])=>!c.archived);
const archiveCourseEntries=registryCourseEntries.filter(([id])=>id==='CVP');
const ospeCourseEntries=activeCourseEntries.filter(([,c])=>!c.noOspe);
const lessonCourseEntries=registryCourseEntries.filter(([,c])=>!c.archived);

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
window.reviewCourseConfig=id=>typeof id==='string'&&Object.hasOwn(courses,id)?courses[id]:undefined;
window.reviewLessonCourseOptions=()=>[['all','All available courses'],...(!enabled()?registryCourseEntries:context?.course==='CVP'?archiveCourseEntries:lessonCourseEntries).map(([id,c])=>[id,c.label])];
window.reviewAllowsUnscheduledDates=id=>typeof id==='string'&&window.reviewCourseConfig(id.split('-')[0])?.unscheduled===true;
window.reviewCvpArchived=enabled;
window.reviewArchiveEnabled=archiveEnabled;
window.reviewViewingArchive=()=>context?.course==='CVP';
window.reviewBookletCourse=()=>context?.view==='booklet'?context.course:enabled()?'REN':'CVP';
window.reviewStudyItemVisible=item=>!enabled()||(context?.course==='CVP'?isCvpStudyItem(item):!isCvpStudyItem(item));
window.reviewArchivedStudyItem=item=>enabled()&&(isCvpStudyItem(item)||Array.isArray(item?.questions)&&item.questions.some(isCvpStudyItem));
const hasReviewDates=item=>item.course!=='REN'||dates(item).some(Boolean);
window.reviewActiveStudyItems=()=>DATA.items.filter(item=>hasReviewDates(item)&&(!enabled()||item.course!=='CVP'));
let context=null,renalLessonId='REN-A1',lastMOLLesson='MOL-1';
function courseSelector(route){
 if(!enabled()||!context||!scopedViews.has(route))return '';
 if(route==='practice'&&window.Phase2Practice&&!['start','original'].includes(etPracticeTab))return '';
 if(route==='practice'&&document.querySelector('#etMockScope,#etScope'))return '';
 const active=context?.course||'REN';
 const options=(active==='CVP'?archiveCourseEntries:route==='ospe'?ospeCourseEntries:activeCourseEntries)
  .map(([id,course])=>[id,course.label+(course.archived?' · Archive':'')]);
 return '<label class="workspace-course-select">Course <select aria-label="Course" data-workspace-course="'+route+'">'+options.map(([key,label])=>
  '<option value="'+key+'" '+(key===active?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  (active==='CVP'?'<div class="course-workspace-links course-workspace-back">'+archiveLink()+'</div>':'');
}

window.reviewCourseSelector=courseSelector;

const courseButton=(course,route,label)=>'<button type="button" data-workspace="'+course+'/'+route+'">'+esc(label)+'</button>';
const archiveLink=()=>courseButton('archive','index','CVP archive');
function archiveIndex(){
 return intro('CVP 112','Course archive','')+
  '<section class="panel"><h2>Cardiovascular & Respiratory</h2><div class="course-workspace-links">'+
  archiveViews.map(route=>courseButton('archive',route,labels[route])).join('')+'</div></section>';
}
function show(route){
 if(route?.view==='library'&&context?.course!==route.course){libraryTab='documents';documentId=null;sourceSearch='';sourceLecture='all';}
 context=route;
 window.reviewCourseScope=route?.course==='CVP'||(route?.course==='MOL'&&route.view!=='learning')||(route?.course==='REN'&&scopedViews.has(route.view))?route.course:null;
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
   if(typeof lessonId!=='string'||!lessonId.startsWith(route.course+'-')){lessonId=DATA.items.find(item=>item.course===route.course)?.id||lessonId;learnTab='lesson';}
  }
  if(view==='practice'&&!((etExam&&!etExam.finishedAt)||(originalRun&&!originalRun.finishedAt))){
   etScope=etMockScope=route.course;
   if(typeof etLecture!=='string'||!etLecture.startsWith(route.course+'-'))etLecture=DATA.items.find(item=>item.course===route.course)?.id||etLecture;
   if(route.course==='MOL')etAccurate=false;
  }

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
window.reviewOpenCourse=(course,route)=>courses[course]&&open(courses[course].slug,route);
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
 if(context?.course==='CVP'&&['labs','ospe','library'].includes(next))return open('archive',next);
 if(context?.course==='MOL'&&['labs','library'].includes(next))return open('mol',next);
 if(next==='practice'&&originalRun&&!originalRun.finishedAt&&originalRun.setId?.startsWith('ren-'))return open('renal','practice');
 if(next==='practice'&&((etExam&&!etExam.finishedAt&&!window.reviewArchivedStudyItem(etExam))||(originalRun&&!originalRun.finishedAt&&!window.reviewArchivedStudyItem(ORIGINAL_EXAMS.sets.find(s=>s.id===originalRun.setId))))){
  show(null);return legacyGo(next);
 }
 if(next==='learning'&&view==='learning'&&context&&typeof lessonId==='string'&&lessonId.startsWith(context.course+'-'))return render();
 if(next!=='dashboard'&&renalViews.includes(next))return open('renal',next);
 show(null);
 return legacyGo(next);
};
const selectLesson=window.chooseLesson;
window.chooseLesson=function(id,...args){
 if(!enabled())return selectLesson(id,...args);
 if(typeof id!=='string'||!DATA.items.some(item=>item.id===id))return;
 if(Object.hasOwn(renalTeaching.guides,id)){
  if(renalLessonId!==id&&typeof resetDeepLearning==='function')resetDeepLearning();
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
 if(context?.view==='index'){
  applyTheme();
  paintProfile();
  document.body.classList.remove('schedule-expanded');
  content.innerHTML=archiveIndex();
  highlight();window.mountOtherTools?.();
  return;
 }
 const value=legacyRender(...args);
 for(const selector of content.querySelectorAll(':scope > .workspace-course-select'))selector.remove();
 if(context&&(context.course==='CVP'||context.course==='MOL')&&!document.getElementById('xpExam')){
  const combined=['library','labs','ospe','booklet'].includes(context.view)?'':courseSelector(context.view);
  if(combined)content.insertAdjacentHTML('afterbegin',combined);
  else if(context.course==='CVP'&&!scopedViews.has(context.view))content.insertAdjacentHTML('afterbegin','<div class="course-workspace-links course-workspace-back">'+archiveLink()+'</div>');
 }
 if(context?.course==='REN'&&view==='practice'&&!document.getElementById('xpExam'))content.insertAdjacentHTML('afterbegin',courseSelector(view));
 if(context){highlight();window.mountOtherTools?.();}
 return value;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-workspace]');
 if(button)open(...button.dataset.workspace.split('/'));
});
document.addEventListener('change',event=>{
 const target=event.target;
 if(enabled()&&['etMockScope','etScope'].includes(target.id)&&['REN','MOL'].includes(target.value)&&(target.value!==context?.course)){
  open(target.value==='REN'?'renal':'mol','practice');
 }
 if(target.matches?.('[data-workspace-course]')){
  const course=window.reviewCourseConfig(target.value)?.slug;
  if(course)open(course,target.dataset.workspaceCourse);
 }
 if(!enabled()||target.id!=='lessonCourse'||context?.course==='CVP')return;
 event.stopImmediatePropagation();
 const filter=target.value;
 if(!['REN','MOL','all','today','midterm'].includes(filter))return;
 if(filter==='REN')open('renal','learning');
 else if(filter==='all'&&context?.course==='REN'){lessonCourse=filter;render();}
 else{
  if(context?.course==='REN')show({course:'MOL',view:'learning'});
  lessonId=typeof lessonId==='string'&&lessonId.startsWith('MOL-')?lessonId:lastMOLLesson;
  lessonCourse=filter;
  history.replaceState(null,'','#mol/learning');
  render();
 }
},true);
for(const event of ['hashchange','popstate'])window.addEventListener(event,()=>{restore();render();});
window.addEventListener('review-course-controls',()=>{restore();render();});
restore();
