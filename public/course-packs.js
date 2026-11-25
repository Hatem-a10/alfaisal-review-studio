'use strict';
// Loads each course's content pack on demand (see scripts/course-packs.mjs). Without a manifest
// (unbundled development), every course is already present and this file does nothing.
function __reviewMergeArray(path,target,entries){
 const order=__REVIEW_ORDER.get(path)||new WeakMap(),out=[];let j=0;
 for(const item of target){
  const ord=item&&typeof item==='object'&&order.has(item)?order.get(item):Infinity;
  while(j<entries.length&&entries[j][0]<ord){order.set(entries[j][1],entries[j][0]);out.push(entries[j][1]);j++}
  out.push(item);
 }
 for(;j<entries.length;j++){order.set(entries[j][1],entries[j][0]);out.push(entries[j][1])}
 target.splice(0,target.length,...out);
 __REVIEW_ORDER.set(path,order);
}
function __reviewMergeKeys(path,target,entries){
 const order=__REVIEW_ORDER.get(path)||new Map(),rows=Object.keys(target).map((key,i)=>[order.has(key)?order.get(key):Infinity,i,key,target[key]]);
 for(const [ord,key,value] of entries){
  const existing=rows.find(row=>row[2]===key);
  // A boot step may already have created this key; keep the original value first, then its additions.
  if(existing){if(Array.isArray(existing[3])&&Array.isArray(value)){existing[3].unshift(...value.filter(v=>!existing[3].includes(v)))}else if(existing[3]&&typeof existing[3]==='object'&&value&&typeof value==='object'){existing[3]=Object.assign(value,existing[3])}existing[0]=ord;continue}
  rows.push([ord,rows.length,key,value]);
 }
 rows.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 for(const key of Object.keys(target))delete target[key];
 for(const [ord,,key,value] of rows){target[key]=value;if(ord!==Infinity)order.set(key,ord)}
 __REVIEW_ORDER.set(path,order);
}
(()=>{
 const packs=globalThis.REVIEW_COURSE_PACKS||{},loaded=new Set(),pending=Object.create(null),failed=Object.create(null);
 const owns=c=>typeof c==='string'&&Object.hasOwn(packs,c),has=c=>!owns(c)||loaded.has(c)&&!failed[c];
 window.__reviewCourseReady=course=>{
  if(!owns(course)||!pending[course]||failed[course]||loaded.has(course))return;
  loaded.add(course);
  try{inlineLessonCache.clear()}catch{}
  window.dispatchEvent(new CustomEvent('review-course-loaded',{detail:{course}}));
 };
 function load(course){
  if(has(course))return Promise.resolve();
  if(failed[course])return Promise.reject(failed[course]);
  if(pending[course])return pending[course];
  let resolve,reject,script,timer,settled=false;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
  pending[course]=promise;
  const finish=(error,fatal=false)=>{
   if(settled)return;settled=true;
   if(timer!==undefined)clearTimeout(timer);
   delete pending[course];
   if(script){script.onload=script.onerror=null;try{script.remove()}catch{}}
   if(error){if(fatal)failed[course]=error;reject(error)}else resolve();
  };
  try{
   script=document.createElement('script');
   script.src=packs[course];script.async=false;
   script.onload=()=>loaded.has(course)?finish():finish(Error('The '+course+' course did not finish loading.'),true);
   script.onerror=()=>finish(Error('Could not download the '+course+' course. Check your connection and try again.'));
   // A timed-out script may already have executed partially. Require a reload rather than replaying it.
   timer=setTimeout(()=>finish(Error('Loading '+course+' timed out. Reload to retry safely.'),true),30000);
   document.head.append(script);
  }catch{finish(Error('Could not start loading '+course+'. Try again.'))}
  return promise;
 }
 // Packs run one after another so merges and replays never interleave.
 let chain=Promise.resolve();
 function ensure(courses){const list=[...new Set(courses)].filter(c=>!has(c));if(!list.length)return Promise.resolve();const run=chain.then(()=>list.reduce((p,c)=>p.then(()=>load(c)),Promise.resolve()));chain=run.catch(()=>{});return run}
 window.reviewCourseLoaded=has;
 window.reviewEnsureCourses=ensure;
 window.reviewLoadedCourses=()=>Object.keys(packs).filter(has);
 if(!Object.keys(packs).length)return;

 function courseLoadingMarkup(courses){
  const safe=courses.filter(c=>typeof c==='string'&&/^[A-Z]{2,6}$/.test(c)).slice(0,4).join(' and ');
  return '<section class="panel course-load-shell" role="status" aria-live="polite" aria-busy="true"><h2>Opening '+esc(safe)+' study content</h2><p>Loading verified course materials. Your saved progress remains on this device.</p><div class="course-load-skeleton" aria-hidden="true"><div class="course-load-title"></div><div class="course-load-row"></div><div class="course-load-row short"></div><div class="course-load-row"></div><div class="course-load-row short"></div></div></section>';
 }
 // Views that show no course content render without any pack.
 const noContent=new Set(['dashboard','planner','calendar','countdowns','grades','activity','methods','anatomy','index']);
 const everything=new Set(['weakness','wrong-bank','sources','search']);
 // The course the student is looking at decides what loads; mixed views load every active course.
 function needed(){
  const current=typeof view==='string'?view:'dashboard';
  if(noContent.has(current))return [];
  const all=Object.keys(packs);
  // Archive visibility and archive permission are different: a hidden CVP course is
  // still archived when the owner has disabled access to the archive itself.
  const inArchive=window.reviewViewingArchive?.()===true&&window.reviewArchiveEnabled?.()===true;
  const archived=c=>c==='CVP'&&(window.REVIEW_STUDIO_FRESH_ACCOUNTS===true||window.reviewCvpArchived?.()===true||window.reviewArchiveEnabled?.()===true)&&!inArchive;
  const active=all.filter(c=>!archived(c)),courseOf=id=>typeof id==='string'?id.split('-')[0]:'';
  const known=c=>c==='REN'||Boolean(window.reviewCourseConfig?.(c))||owns(c);
  const scope=window.reviewCourseScope;
  if(everything.has(current))return active;
  // Learn always needs every active course: its catalogue checks today's due lessons across courses.
  // An old selected lecture must not load a hidden course pack on an active-course screen.
  if(current==='learning')return [...new Set([...active,courseOf(typeof lessonId==='string'?lessonId:'')])].filter(c=>owns(c)&&!archived(c));
  if(typeof scope==='string'&&known(scope))return owns(scope)&&!archived(scope)?[scope]:[];
  return active;
 }
 let painted='',renderRequest=0;
 const before=render;
 render=function(){
  const run=++renderRequest,need=needed().filter(c=>!has(c));
  if(!need.length){painted='';return before.apply(this,arguments)}
  const content=document.getElementById('content'),key=view+':'+need.join(',');
  const error=need.map(c=>failed[c]).find(Boolean);
  if(error){painted='';if(content)content.innerHTML='<section class="panel notice" role="alert">'+esc(error.message)+' <button id="reloadForCourse" class="primary">Reload</button></section>';return}
  if(content&&painted!==key){painted=key;content.innerHTML=courseLoadingMarkup(need)}
  ensure(need).then(()=>{if(run!==renderRequest)return;painted='';render()},e=>{if(run!==renderRequest)return;painted='';if(content){const fatal=need.some(c=>failed[c]);content.innerHTML='<section class="panel notice" role="alert">'+esc(e.message)+(fatal?' <button id="reloadForCourse" class="primary">Reload</button>':' <button id="retryCourse">Try again</button>')+'</section>'}});
 };
 async function reloadCourse(button){
  if(button.disabled||document.body.classList.contains('xp-exam-active'))return;
  button.disabled=true;
  try{
   if(window.ReviewDevice){if(!window.ReviewDevice.available)throw Error('Device storage unavailable');await window.ReviewDevice.flush()}
   if(document.body.classList.contains('xp-exam-active')){button.disabled=false;return}
   location.reload();
  }catch{
   button.disabled=false;
   button.textContent='Retry reload';
   const panel=button.closest('[role=alert]');if(panel&&!panel.querySelector('[data-course-save-warning]')){const warning=document.createElement('p');warning.dataset.courseSaveWarning='';warning.textContent='Could not confirm device saving. Keep this tab open and retry or export a backup.';panel.append(warning)}
  }
 }
 document.addEventListener('click',e=>{if(e.target.closest('#retryCourse'))render();else{const button=e.target.closest('#reloadForCourse');if(button)reloadCourse(button)}});
 // The corrected CVP booklet tools need CVP content.
 const loadCvp19=window.loadCvp19;
 if(typeof loadCvp19==='function')window.loadCvp19=()=>loadCvp19().then(api=>{if(api&&!api.__coursePacks){for(const name of ['ensure','accurate'])if(typeof api[name]==='function'){const fn=api[name];api[name]=(...args)=>ensure(['CVP']).then(()=>fn.apply(api,args))}api.__coursePacks=true}return api});
})();
