'use strict';
/* Generated change log compares incorporated course data on each build. */
(()=>{
 let log=null,expanded=false,request=null,generation=0,status='';
 const array=v=>Array.isArray(v)?v:[];
 const validStamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const validId=v=>typeof v==='string'&&v.length>0&&v.length<=160;
 const visible=id=>validId(id)&&window.reviewStudyItemVisible?.({id,lectureId:id})!==false;
 const findTitle=id=>{const item=DATA.items.find(x=>x.id===id);return item?item.code+' · '+title(item):id};
 function normalizeLog(data){
  if(!data||data.version!==1||!Array.isArray(data.entries)||data.entries.length>50||!validStamp(data.baselineAt))throw Error('Invalid lecture change log');
  for(const e of data.entries)if(!e||!validStamp(e.at)||!Array.isArray(e.changes)||e.changes.some(c=>!validId(c?.id)||!Array.isArray(c.details)||!c.details.every(v=>typeof v==='string')))throw Error('Invalid lecture change log');
  return data;
 }
 function entries(){
  const all=array(log?.entries).flatMap(e=>e.changes.filter(c=>visible(c.id)).map(c=>({at:e.at,id:c.id,details:c.details,kind:'Course update'})));
  const queue=StudyVault.read('queue',{items:{}}),seen=new Set();
  for(const x of array(uploads)){
   if(!validId(x?.id)||seen.has(x.id)||!visible(x.lectureId)||!validStamp(x.createdAt)||typeof x.name!=='string')continue;
   seen.add(x.id);const item=queue?.items?.[x.id],approved=array(item?.candidates).filter(c=>c?.status==='approved').length;
   all.push({at:x.createdAt,id:x.lectureId,details:['Uploaded material: '+x.name+(approved?' · '+approved+' questions currently approved':'')],kind:'Your upload'});
  }
  return all.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 }
 function enabled(){return window.reviewAdmin===true&&storeOptions()?.adminLectureChanges!==false}
 function invalidate(){generation++;request?.abort();request=null;log=null;status=''}
 function updates(){if(!enabled())return '';const all=entries(),items=all.filter(x=>x.id===lessonId);return `<details class="panel lecture-updates" data-lecture-updates ${expanded?'open':''}><summary><span>Lecture change log</span><small>${items.length} for this lesson · ${all.length} total</small></summary><p class="section-sub">Course updates are recorded when a new version is built. Your reviewed uploads are shown separately. Earlier history was not available.</p>${status==='loading'||window.reviewAutoRetry?.pending('lecture-changelog')?'<p role="status">Loading course changes…</p>':''}<div class="lecture-updates-list">${items.slice(0,8).map(x=>`<article><span>${esc(x.kind)} · ${esc(stamp(x.at))}</span><p>${x.details.map(esc).join(' · ')}</p></article>`).join('')||(status==='ready'?'<p class="muted">No recorded changes for this lesson yet.</p>':'')}</div>${all.length?`<details><summary>All lecture updates · ${all.length}</summary>${all.slice(0,50).map(x=>`<article class="lecture-update-row"><div><b>${esc(findTitle(x.id))}</b><small>${esc(x.kind)} · ${esc(stamp(x.at))}</small><p>${x.details.map(esc).join(' · ')}</p></div><button type="button" data-change-lesson="${esc(x.id)}" ${DATA.items.some(item=>item.id===x.id)?'':'disabled'}>Open lesson</button></article>`).join('')}</details>`:''}<small>Tracking began ${log?.baselineAt?esc(stamp(log.baselineAt)):'with this version'}.</small></details>`}
 const old=learning;learning=function(){const html=old();return html.replace('<div class="learning-main">','<div class="learning-main">'+updates())};
 document.addEventListener('toggle',e=>{if(e.target.matches?.('[data-lecture-updates]')&&e.target.isConnected)expanded=e.target.open},true);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-change-lesson]');if(b&&enabled()&&visible(b.dataset.changeLesson)&&DATA.items.some(x=>x.id===b.dataset.changeLesson)){chooseLesson(b.dataset.changeLesson)}if(e.target.closest('[data-retry-lecture-changelog]')&&enabled())refresh()});
 async function refresh(){
  if(!enabled()){invalidate();return}
  if(status==='loading')return;
  const id=++generation,controller=typeof AbortController==='function'?new AbortController():null;request=controller;status='loading';paint();
  const timeout=controller?setTimeout(()=>controller.abort(),15000):null;
  try{
   const response=await fetch('/api/lecture-changelog',{cache:'no-store',credentials:'same-origin',...(controller?{signal:controller.signal}:{})});
   if(!response.ok)throw Error('Change log unavailable');
   const data=normalizeLog(await response.json());
   if(id===generation&&enabled()){log=data;status='ready';paint()}
  }catch{if(id===generation&&enabled()){log=null;status='idle';window.reviewAutoRetry?.schedule('lecture-changelog',()=>{if(enabled())refresh()})}}
  finally{if(timeout!==null)clearTimeout(timeout);if(id===generation)request=null}
 }
 function paint(){if(view==='learning'){const position=scrollY;render();scrollTo({top:position,behavior:'instant'})}}
 window.addEventListener('review-admin-role',()=>{if(!enabled()){invalidate();paint()}else refresh()});window.addEventListener('lecture-changelog-preference',()=>{invalidate();if(enabled())refresh();else paint()});if(enabled())refresh();
})();
