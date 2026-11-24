/* One primary rail; secondary tools retain their original renderers and data. */
(()=>{
 const sidebar=document.querySelector('#mainSidebar'),nav=sidebar.querySelector('nav'),extras=sidebar.querySelector('#navExtras'),anatomy=extras?.querySelector('[data-view="anatomy"]'),anki=nav.querySelector('[data-view="anki"]');if(anatomy)nav.insertBefore(anatomy,anki);
 const railIcon=path=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const homeIcon=railIcon('<path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 21v-6a2 2 0 0 1 4 0v6"/>');
 const otherIcon=railIcon('<rect x="3.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="14.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="3.5" y="14.5" width="6" height="6" rx="1.4"/><path d="M17.5 14.5v6m-3-3h6"/>');
 const tools=[...(extras?.querySelectorAll('button[data-view]')||[])].map(b=>({id:b.dataset.view,label:b.textContent.trim(),icon:b.querySelector('svg')?.outerHTML||navGlyph('extras')}));
 tools.sort((a,b)=>Number(b.id==='activity')-Number(a.id==='activity'));const ids=new Set(tools.map(t=>t.id)),other=document.createElement('button');other.dataset.view='other';other.id='otherToolsNav';other.innerHTML=otherIcon+'<span>Other</span>';other.title='Other study tools';other.setAttribute('aria-label','Other study tools');extras?.replaceWith(other);
 let selected=ids.has('activity')?'activity':tools[0]?.id;
 try{const saved=localStorage.getItem('studio-other-tab');if(ids.has(saved))selected=saved}catch{}
 const previousGo=go;go=function(v){if(v==='other')v=selected;if(ids.has(v)){selected=v;try{localStorage.setItem('studio-other-tab',v)}catch{}previousGo(v);history.replaceState(null,'','#other/'+v);return}return previousGo(v)};
 window.mountOtherTools=function(){
  const current=window.reviewViewingArchive?.()?'archive':view;
  const visible=ids.has(view)||current==='archive';
  if(visible&&!document.querySelector('#otherToolsTabs')){
   const tabs=document.createElement('nav');
   tabs.id='otherToolsTabs';tabs.setAttribute('aria-label','Other study tools');
   const entries=tools.slice();
   if(window.reviewArchiveEnabled?.()){
    const library=entries.findIndex(t=>t.id==='library');
    entries.splice(library<0?entries.length:library+1,0,{id:'archive',label:'Archive',icon:navGlyph('extras')});
   }
   tabs.innerHTML='<span>Other</span><div>'+entries.map(t=>'<button type="button" data-view="'+t.id+'" class="'+(t.id===current?'selected':'')+'" '+(t.id===current?'aria-current="page"':'')+'>'+t.icon+esc(t.label)+'</button>').join('')+'</div>';
   document.querySelector('#content').prepend(tabs);
  }
  for(const button of document.querySelectorAll('[data-view=other]')){
   button.classList.toggle('active',visible);
   if(visible)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
 };
 const before=render;render=function(){before();window.mountOtherTools()};
 function restore(){const hash=location.hash.slice(1),id=hash.startsWith('other/')?hash.slice(6):hash==='other'?selected:null;if(ids.has(id)){selected=id;view=id;render()}}
 for(const e of ['popstate','hashchange'])window.addEventListener(e,restore);restore();
 const mobile=document.querySelector('.ui-mobile-nav');if(mobile){mobile.querySelector('#hubMore')?.remove();mobile.querySelectorAll('[data-mobile-extra]').forEach(b=>{if(b.id==='mobileSyncSettings'){b.hidden=false;b.removeAttribute('data-mobile-extra')}else b.remove()});mobile.querySelector('#hubMobileExtras')?.remove();const a=anatomy?.cloneNode(true);if(a){a.classList.remove('active');a.removeAttribute('aria-current');a.hidden=false;a.removeAttribute('data-mobile-extra');mobile.insertBefore(a,mobile.querySelector('[data-view="anki"]'))}const b=other.cloneNode(true);b.removeAttribute('id');b.classList.remove('active');b.removeAttribute('aria-current');mobile.append(b);
  const home=mobile.querySelector('[data-view="dashboard"]');
  if(home){home.querySelector('svg')?.remove();home.insertAdjacentHTML('afterbegin',homeIcon);}
}
})();
