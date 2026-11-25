// Index only source labels and stems; keys, answers and study-priority metadata stay out.
export const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const titleCache=new WeakMap();
function normalizedTitle(item){const title=item.title;if(typeof title!=='string')return normalize(title);const cached=titleCache.get(item);if(cached?.title===title)return cached.normalized;const normalized=normalize(title);titleCache.set(item,{title,normalized});return normalized}
export function buildIndex({lectures=[],objectives=[],questions=[],materials=[]}){const seen=new Set();return [['lecture',lectures],['objective',objectives],['question',questions],['material',materials]].flatMap(([kind,items])=>items.flatMap(item=>{const key=kind+':'+item.id;if(!item.id||!item.title||seen.has(key))return [];seen.add(key);const entry={...item,kind,key,search:normalize(item.title+' '+(item.context||''))};return [entry]}))}
// A5-030/A5-117: cooperatively build large search indexes without blocking the
// search dialog or publishing results from a closed/superseded session.
// Keep the exact ordering, duplicate identity rule, and searchable fields of buildIndex.
export async function buildIndexCooperatively(data,{allow=()=>true,yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),batchSize=512}={}){
 if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>4096)throw Error('Invalid search indexing batch size');
 const seen=new Set(),output=[];let processed=0;
 for(const [kind,items] of [['lecture',data.lectures||[]],['objective',data.objectives||[]],['question',data.questions||[]],['material',data.materials||[]]]){
  for(const item of items){
   if(!allow())return null;
   const key=kind+':'+item.id;
   if(item.id&&item.title&&!seen.has(key)){
    seen.add(key);
    output.push({...item,kind,key,search:normalize(item.title+' '+(item.context||''))});
   }
   if(++processed%batchSize===0){await yieldControl();if(!allow())return null}
  }
 }
 return allow()?output:null;
}
// A5-119: large ungraded search indexes can be prepared in an isolated module
// worker. On unavailable Worker/CSP/clone failure, retain the bounded cooperative
// main-thread path. Nothing is written to storage or posted off-origin.
export async function buildIndexOffMainThread(data,{allow=()=>true,signal=null,workerFactory=()=>typeof Worker==='function'?new Worker('/phase1-search-worker.mjs',{type:'module'}):null,yieldControl,batchSize=512}={}){
 const eligible=['lectures','objectives','questions','materials'].reduce((n,key)=>n+(Array.isArray(data?.[key])?data[key].length:0),0);
 const active=()=>allow()&&!signal?.aborted;
 const fallback=()=>buildIndexCooperatively(data,{allow:active,yieldControl,batchSize});
 if(!active())return null;
 if(eligible<1500)return fallback();
 let worker;
 try{worker=workerFactory()}catch{return fallback()}
 if(!worker)return fallback();
 return new Promise(resolve=>{
  let finished=false;
  const stop=value=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);worker.terminate();resolve(value)};
  const abort=()=>stop(null);
  const recover=()=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);worker.terminate();void fallback().then(resolve)};
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){stop(null);return}
  worker.onmessage=event=>{
   if(!active()){stop(null);return}
   if(event.data?.ok&&Array.isArray(event.data.index)){stop(event.data.index);return}
   recover();
  };
  worker.onerror=recover;
  try{worker.postMessage({source:data})}catch{recover()}
 });
}
const compareRank=(a,b)=>b.rank-a.rank||a.item.title.localeCompare(b.item.title);
export function searchIndex(index,query,limit=40){
 const text=normalize(query),words=text.split(' ').filter(Boolean);if(!words.length)return [];
 const matches=item=>words.every(word=>item.search.includes(word));
 const ranked=item=>({item,rank:(normalizedTitle(item).startsWith(text)?100:0)+(item.kind==='lecture'?20:0)-item.title.length/1000});
 // Preserve ordinary slice semantics for unusual limits and use native sort for small indexes.
 if(!Number.isInteger(limit)||limit<1||limit>100||index.length<256)return index.filter(matches).map(ranked).sort(compareRank).slice(0,limit).map(x=>x.item);
 const best=[];
 index.forEach(item=>{
  if(!matches(item))return;
  const entry=ranked(item);
  if(best.length===limit&&compareRank(entry,best[best.length-1])>=0)return;
  let low=0,high=best.length;
  // Insert after equal-ranked earlier items, matching stable Array.sort.
  while(low<high){const mid=(low+high)>>>1;if(compareRank(best[mid],entry)<=0)low=mid+1;else high=mid}
  if(best.length===limit)best.pop();
  best.splice(low,0,entry);
 });
 return best.map(x=>x.item);
}
export function filterSearchIndex(index,{kind='all',course='all'}={}){
 return index.filter(item=>(kind==='all'||item.kind===kind)&&(course==='all'||(item.course||String(item.lecture||'').split('-')[0])===course));
}
export function installSearch({read,open,blocked,host=document.querySelector('header')}){
 if(!host||document.getElementById('phase1SearchButton'))return;const button=document.createElement('button');button.id='phase1SearchButton';button.type='button';button.className='phase1-search-toggle';button.setAttribute('aria-label','Search lectures, objectives, questions and materials');button.title='Search · ⌘K / Ctrl+K';button.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>';const controlBar=host.querySelector('#hubTopBody');(controlBar||host).prepend(button);
 const dialog=document.createElement('dialog');dialog.id='phase1Search';dialog.setAttribute('aria-labelledby','phase1SearchTitle');dialog.innerHTML='<div class="section-head"><h2 id="phase1SearchTitle">Quick search</h2><button type="button" data-search-close aria-label="Close search">✕</button></div><label for="phase1SearchInput">Lectures, objectives, questions & materials</label><input id="phase1SearchInput" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="phase1SearchResults"><div class="search-filters"><label>Type <select data-search-kind><option value="all">All types</option><option value="lecture">Lectures</option><option value="objective">Objectives</option><option value="question">Questions</option><option value="material">Materials</option></select></label><label>Course <select data-search-course><option value="all">All available courses</option><option value="REN">Renal</option><option value="MOL">Molecular</option><option value="CVP">Cardiovascular</option></select></label></div><p data-search-status role="status">Type to search.</p><div id="phase1SearchResults" role="listbox" aria-label="Search results"></div>';document.body.append(dialog);const input=dialog.querySelector('input'),list=dialog.querySelector('[role=listbox]'),status=dialog.querySelector('[role=status]');const kind=dialog.querySelector('[data-search-kind]'),course=dialog.querySelector('[data-search-course]');let results=[],selected=0,index=[],timer,previous,request=0,loading=false,failed=false,initialReady=false,enriched=false,enriching=false,resultQuery='',memoIndex=null,memoQuery='',memoResults=null,paintedResults=null,paintedSelected=-1,activeIndexAbort=null;
 async function prepareIndex(data,run){
  activeIndexAbort?.abort();
  const controller=new AbortController();
  activeIndexAbort=controller;
  try{return await buildIndexOffMainThread(data,{allow:()=>dialog.open&&run===request,signal:controller.signal})}
  finally{if(activeIndexAbort===controller)activeIndexAbort=null}
 }
  function paint(){if(paintedResults!==results){list.replaceChildren();results.forEach((item,i)=>{const row=document.createElement('button');row.type='button';row.tabIndex=-1;row.id='phase1-result-'+i;row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===selected));const kind=document.createElement('small');kind.textContent=item.kind+(item.context?' · '+item.context:'');const title=document.createElement('span');title.textContent=item.title;row.append(kind,title);list.append(row)});paintedResults=results}else if(paintedSelected!==selected){list.children[paintedSelected]?.setAttribute('aria-selected','false');list.children[selected]?.setAttribute('aria-selected','true')}paintedSelected=selected;input.setAttribute('aria-expanded',String(results.length>0));if(results.length){input.setAttribute('aria-activedescendant','phase1-result-'+selected);list.children[selected]?.scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant');status.textContent=failed?'Search index incomplete. Close and retry.':loading?'Loading additional search results…':input.value.trim()?`${results.length} results${results.length===40?' · refine your search':''}`:'Type to search.'}
 function activate(i){if(resultQuery!==input.value||!results[i]||blocked())return;const item=results[i];dialog.close();open(item)}
 function refresh(preserve=false){const key=preserve&&resultQuery===input.value?results[selected]?.key:null,text=normalize(input.value),filterKey=JSON.stringify([text,kind?.value||'all',course?.value||'all']);if(memoIndex!==index||memoQuery!==filterKey||memoResults===null){memoIndex=index;memoQuery=filterKey;memoResults=searchIndex(filterSearchIndex(index,{kind:kind?.value||'all',course:course?.value||'all'}),input.value)}results=memoResults;resultQuery=input.value;selected=key?Math.max(0,results.findIndex(item=>item.key===key)):0;paint()}
 function flushQuery(){clearTimeout(timer);if(resultQuery!==input.value)refresh()}
 async function enrich(run){
  if(!initialReady||enriched||enriching||!input.value.trim()||!dialog.open||run!==request)return;
  enriching=true;loading=true;paint();
  try{const loaded=await read({enrich:true});if(!dialog.open||run!==request)return;const built=await prepareIndex(loaded,run);if(!built)return;index=built;enriched=true;refresh(true)}
  catch{if(dialog.open&&run===request)failed=true}
  finally{if(dialog.open&&run===request){enriching=false;loading=false;paint()}}
 }
 async function show(){
  if(blocked()||dialog.open||document.querySelector('dialog[open]'))return;
  const run=++request;
  activeIndexAbort?.abort();
  previous=document.activeElement;if(kind)kind.value='all';if(course)course.value='all';input.value='';resultQuery='';index=[];results=[];memoIndex=null;memoResults=null;memoQuery='';selected=0;loading=true;failed=false;initialReady=false;enriched=false;enriching=false;paint();dialog.showModal();input.focus({preventScroll:true});
  try{
   const initial=await read();
   if(!dialog.open||run!==request)return;
   const built=await prepareIndex(initial,run);if(!built)return;index=built;initialReady=true;loading=false;refresh();void enrich(run);
  }catch{if(dialog.open&&run===request){loading=false;failed=true;paint()}}
 }
 for(const select of [kind,course])select?.addEventListener('change',()=>{refresh();void enrich(request)});list.addEventListener('click',e=>{const row=e.target?.closest?.('[role=option]');if(!row)return;const i=Array.prototype.indexOf.call(list.children,row);if(i>=0)activate(i)});input.addEventListener('input',()=>{clearTimeout(timer);const run=request;timer=setTimeout(()=>{if(!dialog.open||run!==request)return;refresh();void enrich(run)},75)});input.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();flushQuery();if(results.length)selected=(selected+(e.key==='ArrowDown'?1:-1)+results.length)%results.length;paint()}else if(e.key==='Enter'){e.preventDefault();flushQuery();activate(selected)}});dialog.querySelector('[data-search-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(dialog.open)return;clearTimeout(timer);request++;activeIndexAbort?.abort();index=[];results=[];memoIndex=null;memoResults=null;memoQuery='';paintedResults=null;paintedSelected=-1;list.replaceChildren();loading=false;failed=false;previous?.focus?.({preventScroll:true})});button.onclick=show;document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(dialog.open)dialog.close();else show()}});return dialog;
}
