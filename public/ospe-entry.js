function learningAreaTabs(selected){const icons={learning:navGlyph('book'),labs:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 3h6m-5 0v7L4 20h16l-6-10V3M8 15h8"/></svg>',ospe:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 3h5v8H7zM9 11v3M15 7a7 7 0 0 1 0 14H4m0-7h9"/></svg>'};return '<div class="learning-kind-switch" aria-label="Learning area">'+[['learning','Lessons'],['labs','Labs & practicals'],['ospe','OSPE']].map(([id,label])=>'<button data-view="'+id+'" class="'+(selected===id?'selected':'')+'">'+icons[id]+label+'</button>').join('')+'</div>'+(window.reviewCourseSelector?.(selected)||'')}
'use strict';
(()=>{
 const workspaces=new Map();
 const ospeCourse=()=>window.reviewCourseScope==='REN'?'REN':'CVP';
 let labPending=null,labFailed='',paintedCourse;
 const oldLearning=learning;learning=function(){return learningAreaTabs('learning')+oldLearning()};
 const prev=render;
 render=function(){
  if(!['ospe','labs'].includes(view)){paintedCourse=null;return prev();}
  if(document.documentElement.dataset.boot==='loading'&&!window.reviewBootRender)return;
  applyTheme();
  paintProfile();
  const content=document.querySelector('#content');
  if(view==='labs'){
   paintedCourse=null;
   content.innerHTML=learningAreaTabs('labs')+'<section class="panel" role="status">Opening your lab bench…</section>';
   if(!labPending&&!window.reviewAutoRetry?.pending('labs'))labPending=import('/labs.js?v=5').then(()=>{window.reviewAutoRetry?.ok('labs');if(view==='labs')render()}).catch(error=>{labPending=null;console.error(error);window.reviewAutoRetry?.schedule('labs',()=>{if(view==='labs')render()})});
   return;
  }
  const course=ospeCourse();
  if(!workspaces.has(course))workspaces.set(course,{});
  const workspace=workspaces.get(course);
  if(workspace.ui){
   if(paintedCourse!==course)workspace.ui.resume();
   paintedCourse=course;
   return workspace.ui.render();
  }
  content.innerHTML=learningAreaTabs('ospe')+'<section class="panel" role="status">Opening OSPE preparation…</section>';
  if(!workspace.pending&&!window.reviewAutoRetry?.pending('ospe-'+course))workspace.pending=import('/ospe.js?v=4').then(module=>module.mount(course)).then(ui=>{window.reviewAutoRetry?.ok('ospe-'+course);workspace.ui=ui})
   .catch(error=>{console.error(error);window.reviewAutoRetry?.schedule('ospe-'+course,()=>{if(view==='ospe'&&ospeCourse()===course)render()})}).finally(()=>{
    workspace.pending=null;
    if(view==='ospe'&&ospeCourse()===course)render();
   });
 };
 const oldGo=go;
 go=function(v){
  if(!['ospe','labs'].includes(v))return oldGo(v);
  view=v;history.pushState(null,'','#'+v);render();
 };
 for(const event of ['popstate','hashchange'])window.addEventListener(event,()=>{
  const route=location.hash.slice(1);
  if(['ospe','labs'].includes(route)){view=route;render();}
 });
 document.addEventListener('click',e=>{if(e.target.closest('[data-ospe-load]')){if(view==='labs'){labFailed='';labPending=null}else workspaces.delete(ospeCourse());render()}});
 const previousActivity=HubDomain.activity;HubDomain.activity=function(records){const out=previousActivity(records);for(const a of LabCore.merge({},storeOptions().practical||{}).attempts){const day=Study.localDate(a.at);out[day]??={reviews:0,practice:0,minutes:0};out[day].practice++}return out};
 if(['ospe','labs'].includes(location.hash.slice(1)))view=location.hash.slice(1);
})();
