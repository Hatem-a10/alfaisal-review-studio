/* Published academic schedules are read separately from private progress data. */
(()=>{
 'use strict';
 const api='/api/control-center/student/academics',dayIndex={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
 let published=null,installAttempts=0,countdownAttempts=0;
 const minutes=value=>{const [h,m]=String(value||'').split(':').map(Number);return h*60+m};
 const escText=value=>String(value||'').replace(/\s+/g,' ').trim();
 function eventKind(event){
  const category=String(event.categoryId||'').toLowerCase(),type=String(event.type||'').toLowerCase(),course=String(event.course||'').toUpperCase(),title=String(event.title||'');
  if(type==='english')return 'english';if(type==='lab')return 'lab';if(['exam','tbl','deadline'].includes(type))return 'assessment';
  if(['anatomy','physiology','mol','break','shared','other'].includes(category))return category;
  if(course.includes('MOL'))return 'mol';if(/break|prayer|lunch/i.test(title))return 'break';if(type==='lecture'&&/P\d+/i.test(title))return 'physiology';if(type==='lecture')return 'anatomy';return 'other';
 }
 function forWeek(start){
  if(!published)return [];
  const end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+4);const last=end.toISOString().slice(0,10);
  const result=[];
  for(const item of published.events||[]){
   const dates=item.date?[item.date]:Array.from({length:5},(_,i)=>{const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)}).filter(date=>new Date(date+'T12:00:00Z').getUTCDay()===dayIndex[item.day]);
   for(const date of dates){if(date<start||date>last)continue;
    result.push({id:'admin-'+item.id+'-'+date,date,title:escText(item.title),start:minutes(item.startTime),end:minutes(item.endTime),kind:eventKind(item),course:item.course==='REN 123'?'REN':item.course,doctor:item.lecturer||'',detail:item.lecturer?'Lecturer: '+item.lecturer:'',source:'Admin-published academic revision',custom:false,studentGroups:item.studentGroup?[item.studentGroup]:['M1','M2','F1','F2'],studentSection:item.studentSection||undefined,labGroups:item.labGroup?[item.labGroup]:[],replacesId:item.replacesId||''});
   }
  }
  return result;
 }
 function syncCountdowns(){
  try{if(typeof DATA==='undefined'||!Array.isArray(DATA.events)||!published)return false;
  DATA.events=DATA.events.filter(e=>!e.adminPublishedAcademic);
  for(const item of published.events||[]){
   if(!item.date||!['exam','tbl','deadline'].includes(item.type))continue;
   DATA.events.push({id:'admin-academic-'+item.id,adminPublishedAcademic:true,title:escText(item.title),date:item.date,course:item.course||'Other',type:item.type==='tbl'?'TBL':item.type==='exam'?'Official exam':'Shared deadline',detail:`${item.startTime}–${item.endTime}${item.lecturer?' · '+item.lecturer:''}`,source:'Admin-published academic revision'});
  }return true}catch{return false}
 }
 function replayCountdowns(){if(syncCountdowns()){try{if(typeof view!=='undefined'&&view==='countdowns'&&typeof render==='function')render()}catch{}return}if(countdownAttempts++<100)setTimeout(replayCountdowns,50)}
 function install(){
  try{if(typeof GroupSchedules==='undefined'||!GroupSchedules?.selected){if(installAttempts++<100)setTimeout(install,50);return}}
  catch{if(installAttempts++<100)setTimeout(install,50);return}
  if(GroupSchedules.__adminAcademicInstalled)return;
  const original=GroupSchedules.selected.bind(GroupSchedules);
  GroupSchedules.selected=(start,settings,catalog,legacy,shared)=>{
   let existing=original(start,settings,catalog,legacy,shared);const extra=forWeek(start);
   const replaced=new Set(extra.map(e=>e.replacesId).filter(Boolean));
   if(replaced.size)existing=existing.filter(event=>!replaced.has(event.id)||event.course==='REN'&&/^REN123_Fall 26-27 Weekly Time Table(?:[^/]*\.xlsx)?$/i.test(event.source||''));
   return existing.concat(extra).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start||a.id.localeCompare(b.id));
  };
  GroupSchedules.__adminAcademicInstalled=true;
  try{if(typeof view!=='undefined'&&(view==='calendar'||view==='dashboard')&&typeof render==='function')render()}catch{}
 }
 async function load(){
  try{const response=await fetch(api,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Published schedule unavailable');published=await response.json();
   const assignment=window.reviewManagedAssignment&&typeof window.reviewManagedAssignment==='object'?window.reviewManagedAssignment:published.profile;
   try{if(typeof settings!=='undefined'&&assignment)Object.assign(settings,assignment)}catch{}
   install();replayCountdowns();window.dispatchEvent(new CustomEvent('review:academic-config',{detail:published}));
   try{if(typeof view!=='undefined'&&(view==='calendar'||view==='dashboard')&&typeof render==='function')render()}catch{}
   return published;
  }catch{return null}
 }
 window.reviewStudioReloadAcademicSchedule=load;
 load();
})();
