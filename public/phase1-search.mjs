// Index only source labels and stems; keys, answers and study-priority metadata stay out.
export const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const titleCache=new WeakMap();
function normalizedTitle(item){const title=item.title;if(typeof title!=='string')return normalize(title);const cached=titleCache.get(item);if(cached?.title===title)return cached.normalized;const normalized=normalize(title);titleCache.set(item,{title,normalized});return normalized}
export function buildIndex({lectures=[],objectives=[],questions=[],materials=[]}){const seen=new Set();return [['lecture',lectures],['objective',objectives],['question',questions],['material',materials]].flatMap(([kind,items])=>items.flatMap(item=>{const key=kind+':'+item.id;if(!item.id||!item.title||seen.has(key))return [];seen.add(key);const entry={...item,kind,key,search:normalize(item.title+' '+(item.context||''))};return [entry]}))}
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
export function installSearch({read,open,blocked,host=document.querySelector('header')}){
 if(!host||document.getElementById('phase1SearchButton'))return;const button=document.createElement('button');button.id='phase1SearchButton';button.type='button';button.className='phase1-search-toggle';button.setAttribute('aria-label','Search lectures, objectives, questions and materials');button.title='Search · ⌘K / Ctrl+K';button.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>';const controlBar=host.querySelector('#hubTopBody');(controlBar||host).prepend(button);
 const dialog=document.createElement('dialog');dialog.id='phase1Search';dialog.setAttribute('aria-labelledby','phase1SearchTitle');dialog.innerHTML='<div class="section-head"><h2 id="phase1SearchTitle">Quick search</h2><button type="button" data-search-close aria-label="Close search">✕</button></div><label for="phase1SearchInput">Lectures, objectives, questions & materials</label><input id="phase1SearchInput" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="phase1SearchResults"><p data-search-status role="status">Type to search.</p><div id="phase1SearchResults" role="listbox" aria-label="Search results"></div>';document.body.append(dialog);const input=dialog.querySelector('input'),list=dialog.querySelector('[role=listbox]'),status=dialog.querySelector('[role=status]');let results=[],selected=0,index=[],timer,previous,request=0,loading=false,failed=false,initialReady=false,enriched=false,enriching=false,resultQuery='';
 function paint(){list.replaceChildren();results.forEach((item,i)=>{const row=document.createElement('button');row.type='button';row.tabIndex=-1;row.id='phase1-result-'+i;row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===selected));const kind=document.createElement('small');kind.textContent=item.kind+(item.context?' · '+item.context:'');const title=document.createElement('span');title.textContent=item.title;row.append(kind,title);row.onclick=()=>activate(i);list.append(row)});input.setAttribute('aria-expanded',String(results.length>0));if(results.length){input.setAttribute('aria-activedescendant','phase1-result-'+selected);list.children[selected]?.scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant');status.textContent=failed?'Search index incomplete. Close and retry.':loading?'Loading additional search results…':input.value.trim()?`${results.length} results${results.length===40?' · refine your search':''}`:'Type to search.'}
 function activate(i){if(resultQuery!==input.value||!results[i]||blocked())return;const item=results[i];dialog.close();open(item)}
 function refresh(preserve=false){const key=preserve&&resultQuery===input.value?results[selected]?.key:null;results=searchIndex(index,input.value);resultQuery=input.value;selected=key?Math.max(0,results.findIndex(item=>item.key===key)):0;paint()}
 function flushQuery(){clearTimeout(timer);if(resultQuery!==input.value)refresh()}
 async function enrich(run){
  if(!initialReady||enriched||enriching||!input.value.trim()||!dialog.open||run!==request)return;
  enriching=true;loading=true;paint();
  try{const loaded=await read({enrich:true});if(!dialog.open||run!==request)return;index=buildIndex(loaded);enriched=true;refresh(true)}
  catch{if(dialog.open&&run===request)failed=true}
  finally{if(dialog.open&&run===request){enriching=false;loading=false;paint()}}
 }
 async function show(){
  if(blocked()||dialog.open||document.querySelector('dialog[open]'))return;
  const run=++request;
  previous=document.activeElement;input.value='';resultQuery='';index=[];results=[];selected=0;loading=true;failed=false;initialReady=false;enriched=false;enriching=false;paint();dialog.showModal();input.focus({preventScroll:true});
  try{
   const initial=await read();
   if(!dialog.open||run!==request)return;
   index=buildIndex(initial);initialReady=true;loading=false;refresh();void enrich(run);
  }catch{if(dialog.open&&run===request){loading=false;failed=true;paint()}}
 }
 input.addEventListener('input',()=>{clearTimeout(timer);const run=request;timer=setTimeout(()=>{if(!dialog.open||run!==request)return;refresh();void enrich(run)},75)});input.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();flushQuery();if(results.length)selected=(selected+(e.key==='ArrowDown'?1:-1)+results.length)%results.length;paint()}else if(e.key==='Enter'){e.preventDefault();flushQuery();activate(selected)}});dialog.querySelector('[data-search-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(dialog.open)return;clearTimeout(timer);request++;index=[];results=[];loading=false;failed=false;previous?.focus?.({preventScroll:true})});button.onclick=show;document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(dialog.open)dialog.close();else show()}});return dialog;
}
