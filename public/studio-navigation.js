/* One primary rail; secondary tools retain their original renderers and data. */
(()=>{
 const sidebar=document.querySelector('#mainSidebar'),nav=sidebar?.querySelector('nav');if(!nav)return;const extras=sidebar.querySelector('#navExtras'),anatomy=extras?.querySelector('[data-view="anatomy"]');
 let microscopeCleanup;
 const railIcon=path=>'<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const homeIcon=railIcon('<path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 21v-6a2 2 0 0 1 4 0v6"/>');
 const otherIcon=navGlyph('more');
 const mobileRoutes=['dashboard','learning','calendar','practice'];
 const desktopRoutes=[['learning','Learn','book'],['calendar','Schedule','calendar'],['practice','Practice','practice'],['countdowns','Countdowns','hourglass'],['booklet','Booklet','booklet']];
 const desktopOnly=['countdowns','booklet'];
 const mobileLayout=matchMedia('(max-width:760px)');
 const profile=sidebar.querySelector('.brand');
 const routeButton=(root,id)=>root.querySelector('button[data-view="'+id+'"]');
 const toolFrom=b=>({id:b.dataset.view,label:b.textContent.trim(),icon:b.querySelector('svg')?.outerHTML||navGlyph('extras')});
 const microscope={id:'microscope',label:'Microscope Lab',icon:railIcon('<path d="m9 3 4 2-3 7-4-2 3-7Zm1 9a5 5 0 1 1 0 8H5m2-4h8M4 22h16"/>')};
 const tools=[...(extras?.querySelectorAll('button[data-view]')||[])].map(toolFrom);
 tools.push(microscope);
 tools.sort((a,b)=>Number(b.id==='activity')-Number(a.id==='activity'));
 const ids=new Set([...tools.map(t=>t.id).filter(id=>!desktopOnly.includes(id)),'lectures','weakness','methods']);
 const other=document.createElement('button');other.type='button';other.id='otherToolsNav';
 other.innerHTML=otherIcon+'<span>More</span>';other.setAttribute('aria-haspopup','dialog');
 const secondary=[...nav.querySelectorAll(':scope > button[data-view]')].filter(b=>!mobileRoutes.includes(b.dataset.view)&&!desktopOnly.includes(b.dataset.view)).map(toolFrom);
 const desktop=desktopRoutes.map(([id,label,icon])=>{
  const button=routeButton(nav,id)||document.createElement('button');
  button.type='button';button.dataset.view=id;
  button.innerHTML=navGlyph(icon)+'<span>'+label+'</span>';
  button.setAttribute('aria-label',label);button.title=label;
  return button;
 });
 nav.classList.add('simple-desktop-nav');nav.replaceChildren(...desktop,other);
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
  if(visible&&!tabs){
   tabs=document.createElement('nav');tabs.id='otherToolsTabs';tabs.setAttribute('aria-label','Other study tools');
   tabs.innerHTML='<button type="button" data-open-more>← More tools</button>';content.prepend(tabs);
  }
  if(profile){if(view==='dashboard'&&current!=='archive')profile.setAttribute('aria-current','page');else profile.removeAttribute('aria-current');}
  for(const button of [other,document.getElementById('mobileMoreTools')].filter(Boolean)){
   const active=visible||!mobileRoutes.includes(view)&&(button!==other||!desktopOnly.includes(view));
   button.classList.toggle('active',active);
   if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
 };
 const before=render;render=function(...args){let result;
  const active=document.querySelector('#microscopeWorkspace');
  if(view==='microscope'){
   if(!active){
    const host=document.createElement('section');host.id='microscopeWorkspace';host.textContent='Opening Microscope Lab…';
    document.getElementById('content').replaceChildren(host);
    import('./microscope-lab.mjs?v=2').then(module=>{if(host.isConnected&&view==='microscope')microscopeCleanup=module.mount(host)}).catch(()=>{if(host.isConnected)host.textContent='Microscope Lab could not load. Reopen the tool to retry.'});
   }
  }else{
   microscopeCleanup?.();microscopeCleanup=null;result=before.apply(this,args);
  }
  window.mountOtherTools();return result};
 function restore(){const hash=location.hash.slice(1),id=hash.startsWith('other/')?hash.slice(6):hash==='other'?selected:null;if(ids.has(id)){selectOther(id);if(id==='weakness'&&typeof filters==='object'&&filters)filters.status='weak';else if(id==='lectures'&&typeof filters==='object'&&filters?.status==='weak')filters.status='all';if(view!==id){view=id;render()}}}
 for(const e of ['popstate','hashchange'])window.addEventListener(e,restore);restore();
 const mobile=document.querySelector('.ui-mobile-nav');
 if(!mobile)return;
 const shortcuts=mobileRoutes.map(id=>mobile.querySelector('[data-view="'+id+'"]')).filter(Boolean);
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
  const groups=[
   ['Study',[
    ...(anatomy?[toolFrom(anatomy)]:[]),microscope,
    {id:'anki',label:'Anki',icon:navGlyph('cards')},
   ]],
   ['Plan',[{id:'planner',label:'My Study Plan',icon:navGlyph('planner')},{id:'lectures',label:'Review notes & dates',icon:navGlyph('list')},{id:'countdowns',label:'Countdowns',icon:navGlyph('hourglass')}]],
   ['Progress',[{id:'activity',label:'Study Activity',icon:navGlyph('activity')},{id:'grades',label:'Grade Calculator',icon:navGlyph('calculator')},{id:'weakness',label:'Study priorities',icon:navGlyph('weakness')}]],
   ['Help',[{id:'library',label:'Library',icon:navGlyph('library')},{id:'methods',label:'How to study',icon:navGlyph('methods')},...(window.reviewArchiveEnabled?.()?[{id:'archive',label:'Archive',icon:navGlyph('archive')}]:[])]],
  ];
  // OSPE and Labs live in Learn; Booklet has its own sidebar link (and appears here on phones).
  groups[0][1].push({id:'booklet',label:'Booklet',icon:navGlyph('booklet')});
  const included=new Set([...desktopOnly,...groups.flatMap(([,entries])=>entries.map(tool=>tool.id))]);
  groups[0][1].push(...[...secondary,...tools].filter(tool=>!['sources','ospe','labs'].includes(tool.id)&&!included.has(tool.id)&&included.add(tool.id)));
  grid.className='more-tool-groups';
  grid.innerHTML=groups.map(([group,links])=>'<section><h3>'+group+'</h3><div class="mobile-tools-grid">'+links.filter(tool=>mobileLayout.matches||!desktopOnly.includes(tool.id)).map(tool=>'<button type="button" data-view="'+tool.id+'">'+tool.icon+'<span>'+esc(tool.label)+'</span></button>').join('')+'</div></section>').join('');
  if(sync){sync.hidden=!mobileLayout.matches;sync.removeAttribute('data-mobile-extra');grid.append(sync);}
 }
 function openMore(){
  if(document.getElementById('xpExam'))return;
  populate();if(!menu.open)menu.showModal();
 }
 other.onclick=more.onclick=openMore;
 mobileLayout.addEventListener('change',()=>{if(menu.open)populate();});
 document.addEventListener('click',e=>{if(e.target.closest('[data-open-more]'))openMore();});
 grid.addEventListener('click',e=>{if(e.target.closest('button'))menu.close();},true);
 window.mountOtherTools();
})();
