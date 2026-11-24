/* One primary rail; secondary tools retain their original renderers and data. */
(()=>{
 const sidebar=document.querySelector('#mainSidebar'),nav=sidebar?.querySelector('nav');if(!nav)return;const extras=sidebar.querySelector('#navExtras'),anatomy=extras?.querySelector('[data-view="anatomy"]'),anki=nav.querySelector('[data-view="anki"]');if(anatomy)nav.insertBefore(anatomy,anki);
 const railIcon=path=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const homeIcon=railIcon('<path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 21v-6a2 2 0 0 1 4 0v6"/>');
 const otherIcon=railIcon('<rect x="3.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="14.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="3.5" y="14.5" width="6" height="6" rx="1.4"/><path d="M17.5 14.5v6m-3-3h6"/>');
 const tools=[...(extras?.querySelectorAll('button[data-view]')||[])].map(b=>({id:b.dataset.view,label:b.textContent.trim(),icon:b.querySelector('svg')?.outerHTML||navGlyph('extras')}));
 tools.sort((a,b)=>Number(b.id==='activity')-Number(a.id==='activity'));const ids=new Set(tools.map(t=>t.id)),other=document.createElement('button');other.type='button';other.dataset.view='other';other.id='otherToolsNav';other.innerHTML=otherIcon+'<span>Other</span>';other.title='Other study tools';other.setAttribute('aria-label','Other study tools');extras?.replaceWith(other);
 let selected=ids.has('activity')?'activity':tools[0]?.id;
 try{const saved=localStorage.getItem('studio-other-tab');if(ids.has(saved))selected=saved}catch{}
 function selectOther(v){selected=v;try{localStorage.setItem('studio-other-tab',v)}catch{}}
 const previousGo=go;go=function(v){if(v==='other'){if(!selected)return;v=selected}if(ids.has(v)){const result=previousGo(v);if(view===v){selectOther(v);history.replaceState(null,'','#other/'+v)}return result}return previousGo(v)};
 window.mountOtherTools=function(){
  const current=window.reviewViewingArchive?.()?'archive':view;
  const visible=ids.has(view)||current==='archive';
  const content=document.querySelector('#content');if(!content)return;
  let tabs=content.querySelector('#otherToolsTabs');
  if(!visible&&tabs){tabs.remove();tabs=null}
  if(visible){
   if(!tabs){tabs=document.createElement('nav');content.prepend(tabs)}
   tabs.id='otherToolsTabs';tabs.setAttribute('aria-label','Other study tools');
   const entries=tools.slice();
   if(window.reviewArchiveEnabled?.()){
    const library=entries.findIndex(t=>t.id==='library');
    entries.splice(library<0?entries.length:library+1,0,{id:'archive',label:'Archive',icon:navGlyph('extras')});
   }
   const fingerprint=JSON.stringify(entries.map(t=>[t.id,t.label]));
   if(tabs.dataset.entries!==fingerprint){tabs.dataset.entries=fingerprint;tabs.innerHTML='<span>Other</span><div>'+entries.map(t=>'<button type="button" data-view="'+t.id+'">'+t.icon+esc(t.label)+'</button>').join('')+'</div>'}
   for(const b of tabs.querySelectorAll('[data-view]')){const active=b.dataset.view===current;b.classList.toggle('selected',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
  }
  for(const button of document.querySelectorAll('[data-view=other]')){
   button.classList.toggle('active',visible);
   if(visible)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
 };
 const before=render;render=function(...args){const result=before.apply(this,args);window.mountOtherTools();return result};
 function restore(){const hash=location.hash.slice(1),id=hash.startsWith('other/')?hash.slice(6):hash==='other'?selected:null;if(ids.has(id)){selectOther(id);if(id==='weakness'&&typeof filters==='object'&&filters)filters.status='weak';else if(id==='lectures'&&typeof filters==='object'&&filters?.status==='weak')filters.status='all';if(view!==id){view=id;render()}}}
 for(const e of ['popstate','hashchange'])window.addEventListener(e,restore);restore();
 const mobile=document.querySelector('.ui-mobile-nav');
 if(!mobile)return;
 const primary=['dashboard','learning','calendar','practice'];
 const shortcuts=primary.map(id=>mobile.querySelector('[data-view="'+id+'"]')).filter(Boolean);
 const home=shortcuts[0];
 if(home?.dataset.view==='dashboard'){home.querySelector('svg')?.remove();home.insertAdjacentHTML('afterbegin',homeIcon);}
 const sync=mobile.querySelector('#mobileSyncSettings');
 const more=document.createElement('button');
 more.type='button';more.id='mobileMoreTools';more.setAttribute('aria-haspopup','dialog');
 more.innerHTML=otherIcon+'<span>More</span>';
 mobile.classList.add('simple-mobile-nav');mobile.replaceChildren(...shortcuts,more);
 const menu=document.createElement('dialog');
 menu.id='mobileToolsMenu';menu.setAttribute('aria-labelledby','mobileToolsTitle');
 menu.innerHTML='<div class="section-head"><h2 id="mobileToolsTitle">More tools</h2><button type="button" aria-label="Close more tools">✕</button></div><div class="mobile-tools-grid"></div>';
 document.body.append(menu);
 const grid=menu.querySelector('.mobile-tools-grid');
 menu.querySelector('[aria-label="Close more tools"]').onclick=()=>menu.close();
 function populate(){
  const links=[
   {id:'anki',label:'Anki',icon:navGlyph('book')},
   {id:'library',label:'Library',icon:navGlyph('library')},
   ...(window.reviewArchiveEnabled?.()?[{id:'archive',label:'Archive',icon:otherIcon}]:[]),
   {id:'booklet',label:'Booklet',icon:navGlyph('book')},
   {id:'labs',label:'Labs',icon:navGlyph('book')},
   {id:'ospe',label:'OSPE',icon:navGlyph('practice')},
   {id:'countdowns',label:'Countdowns',icon:navGlyph('calendar')},
   ...(anatomy?[{id:'anatomy',label:anatomy.textContent.trim(),icon:anatomy.querySelector('svg')?.outerHTML||''}]:[]),
  ];
  const included=new Set(links.map(tool=>tool.id));
  links.push(...tools.filter(tool=>!included.has(tool.id)));
  grid.innerHTML=links.map(tool=>'<button type="button" data-view="'+tool.id+'">'+tool.icon+'<span>'+esc(tool.label)+'</span></button>').join('');
  if(sync){sync.hidden=false;sync.removeAttribute('data-mobile-extra');grid.append(sync);}
 }
 more.onclick=()=>{populate();menu.showModal();};
 grid.addEventListener('click',e=>{if(e.target.closest('button'))menu.close();},true);
 const previousRender=render;
 render=function(...args){
  const result=previousRender.apply(this,args);
  const active=!primary.includes(view)||window.reviewViewingArchive?.();
  more.classList.toggle('active',Boolean(active));
  if(active)more.setAttribute('aria-current','page');else more.removeAttribute('aria-current');
  return result;
 };
})();
