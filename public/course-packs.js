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
 const packs=globalThis.REVIEW_COURSE_PACKS||{},loaded=new Set(),pending={},failed={};
 const has=c=>!packs[c]||loaded.has(c);
 window.__reviewCourseReady=course=>{
  loaded.add(course);
  try{inlineLessonCache.clear()}catch{}
  window.dispatchEvent(new CustomEvent('review-course-loaded',{detail:{course}}));
 };
 function load(course){
  if(has(course))return Promise.resolve();
  if(failed[course])return Promise.reject(failed[course]);
  return pending[course]??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=packs[course];script.async=false;
   script.onload=()=>loaded.has(course)?resolve():reject(failed[course]=Error('The '+course+' course did not finish loading.'));
   script.onerror=()=>{delete pending[course];script.remove();reject(Error('Could not download the '+course+' course. Check your connection and try again.'))};
   document.head.append(script);
  });
 }
 // Packs run one after another so merges and replays never interleave.
 let chain=Promise.resolve();
 function ensure(courses){const list=[...new Set(courses)].filter(c=>!has(c));if(!list.length)return Promise.resolve();const run=chain.then(()=>list.reduce((p,c)=>p.then(()=>load(c)),Promise.resolve()));chain=run.catch(()=>{});return run}
 window.reviewCourseLoaded=has;
 window.reviewEnsureCourses=ensure;
 window.reviewLoadedCourses=()=>Object.keys(packs).filter(has);
 if(!Object.keys(packs).length)return;

 // Views that show no course content render without any pack.
 const noContent=new Set(['dashboard','planner','calendar','countdowns','grades','activity','methods','anatomy','index']);
 const everything=new Set(['weakness','wrong-bank','sources','search']);
 // The course the student is looking at decides what loads; mixed views load every active course.
 function needed(){
  const current=typeof view==='string'?view:'dashboard';
  if(noContent.has(current))return [];
  const all=Object.keys(packs);
  if(everything.has(current))return all;
  const archived=c=>c==='CVP'&&window.reviewArchiveEnabled?.()===true&&window.reviewViewingArchive?.()!==true;
  const active=all.filter(c=>!archived(c)),courseOf=id=>typeof id==='string'?id.split('-')[0]:'';
  const known=c=>c==='REN'||Boolean(window.reviewCourseConfig?.(c))||Boolean(packs[c]);
  const scope=window.reviewCourseScope;
  // Learn always needs every active course: its catalogue checks today's due lessons across courses.
  if(current==='learning')return [...active,courseOf(typeof lessonId==='string'?lessonId:'')].filter(c=>packs[c]);
  if(typeof scope==='string'&&known(scope))return packs[scope]?[scope]:[];
  return active;
 }
 let painted='';
 const before=render;
 render=function(){
  const need=needed().filter(c=>!has(c));
  if(!need.length)return before.apply(this,arguments);
  const content=document.getElementById('content'),key=view+':'+need.join(',');
  const error=need.map(c=>failed[c]).find(Boolean);
  if(error){if(content)content.innerHTML='<section class="panel notice" role="alert">'+esc(error.message)+' <button id="reloadForCourse" class="primary">Reload</button></section>';return}
  if(content&&painted!==key){painted=key;content.innerHTML='<section class="panel notice" role="status">Loading '+esc(need.join(' and '))+' content…</section>'}
  ensure(need).then(()=>{painted='';render()},e=>{if(content)content.innerHTML='<section class="panel notice" role="alert">'+esc(e.message)+' <button id="retryCourse">Try again</button></section>'});
 };
 document.addEventListener('click',e=>{if(e.target.closest('#retryCourse'))render();else if(e.target.closest('#reloadForCourse'))location.reload()});
 // The corrected CVP booklet tools need CVP content.
 const loadCvp19=window.loadCvp19;
 if(typeof loadCvp19==='function')window.loadCvp19=()=>loadCvp19().then(api=>{if(api&&!api.__coursePacks){for(const name of ['ensure','accurate'])if(typeof api[name]==='function'){const fn=api[name];api[name]=(...args)=>ensure(['CVP']).then(()=>fn.apply(api,args))}api.__coursePacks=true}return api});
})();
