/* One primary rail; secondary tools retain their original renderers and data. */
(()=>{
 const sidebar=document.querySelector('#mainSidebar'),nav=sidebar?.querySelector('nav');if(!nav)return;const extras=sidebar.querySelector('#navExtras'),anatomy=extras?.querySelector('[data-view="anatomy"]');
 const railIcon=path=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
 const homeIcon=railIcon('<path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 21v-6a2 2 0 0 1 4 0v6"/>');
 const otherIcon=railIcon('<rect x="3.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="14.5" y="3.5" width="6" height="6" rx="1.4"/><rect x="3.5" y="14.5" width="6" height="6" rx="1.4"/><path d="M17.5 14.5v6m-3-3h6"/>');
 const primary=['dashboard','learning','calendar','practice'];
 const routeButton=(root,id)=>root.querySelector('button[data-view="'+id+'"]');
 const toolFrom=b=>({id:b.dataset.view,label:b.textContent.trim(),icon:b.querySelector('svg')?.outerHTML||navGlyph('extras')});
 const tools=[...(extras?.querySelectorAll('button[data-view]')||[])].map(toolFrom);
 tools.sort((a,b)=>Number(b.id==='activity')-Number(a.id==='activity'));
 const ids=new Set([...tools.map(t=>t.id),'lectures','weakness','methods','sources']);
 const other=document.createElement('button');other.type='button';other.id='otherToolsNav';
 other.innerHTML=otherIcon+'<span>More</span>';other.setAttribute('aria-haspopup','dialog');
 const secondary=[...nav.querySelectorAll(':scope > button[data-view]')].filter(b=>!primary.includes(b.dataset.view)).map(toolFrom);
 const desktop=primary.map((id,index)=>{
  const label=['Home','Learn','Schedule','Practice'][index];
  const button=routeButton(nav,id)||document.createElement('button');
  button.type='button';button.dataset.view=id;
  button.innerHTML=(id==='dashboard'?homeIcon:button.querySelector('svg')?.outerHTML||navGlyph(['book','book','calendar','practice'][index]))+'<span>'+label+'</span>';
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
  for(const button of [other,document.getElementById('mobileMoreTools')].filter(Boolean)){
   const active=visible||!primary.includes(view);
   button.classList.toggle('active',active);
   if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
 };
 const before=render;render=function(...args){const result=before.apply(this,args);window.mountOtherTools();return result};
 function restore(){const hash=location.hash.slice(1),id=hash.startsWith('other/')?hash.slice(6):hash==='other'?selected:null;if(ids.has(id)){selectOther(id);if(id==='weakness'&&typeof filters==='object'&&filters)filters.status='weak';else if(id==='lectures'&&typeof filters==='object'&&filters?.status==='weak')filters.status='all';if(view!==id){view=id;render()}}}
 for(const e of ['popstate','hashchange'])window.addEventListener(e,restore);restore();
 const mobile=document.querySelector('.ui-mobile-nav');
 if(!mobile)return;
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
  const groups=[
   ['Study',[
    {id:'library',label:'Library',icon:navGlyph('library')},
    ...(window.reviewArchiveEnabled?.()?[{id:'archive',label:'Archive',icon:otherIcon}]:[]),
    {id:'labs',label:'Labs',icon:navGlyph('book')},
    {id:'ospe',label:'OSPE',icon:navGlyph('practice')},
    ...(anatomy?[toolFrom(anatomy)]:[]),
   ]],
   ['Practice',[{id:'booklet',label:'Booklet',icon:navGlyph('book')},{id:'anki',label:'Anki',icon:navGlyph('book')}]],
   ['Plan',[{id:'planner',label:'My Study Plan',icon:navGlyph('planner')},{id:'lectures',label:'Review notes & dates',icon:navGlyph('lectures')},{id:'countdowns',label:'Countdowns',icon:navGlyph('calendar')}]],
   ['Progress',[{id:'activity',label:'Study Activity',icon:navGlyph('dashboard')},{id:'grades',label:'Grade Calculator',icon:navGlyph('practice')},{id:'weakness',label:'Study priorities',icon:navGlyph('weakness')}]],
   ['Help',[{id:'methods',label:'How to study',icon:navGlyph('methods')},{id:'sources',label:'Content sources',icon:navGlyph('sources')}]],
  ];
  const included=new Set(groups.flatMap(([,entries])=>entries.map(tool=>tool.id)));
  groups[0][1].push(...[...secondary,...tools].filter(tool=>!included.has(tool.id)&&included.add(tool.id)));
  grid.className='more-tool-groups';
  grid.innerHTML=groups.map(([group,links])=>'<section><h3>'+group+'</h3><div class="mobile-tools-grid">'+links.map(tool=>'<button type="button" data-view="'+tool.id+'">'+tool.icon+'<span>'+esc(tool.label)+'</span></button>').join('')+'</div></section>').join('');
  if(sync){sync.hidden=!matchMedia('(max-width:760px)').matches;sync.removeAttribute('data-mobile-extra');grid.append(sync);}
 }
 function openMore(){
  if(document.getElementById('xpExam'))return;
  populate();if(!menu.open)menu.showModal();
 }
 other.onclick=more.onclick=openMore;
 document.addEventListener('click',e=>{if(e.target.closest('[data-open-more]'))openMore();});
 grid.addEventListener('click',e=>{if(e.target.closest('button'))menu.close();},true);
 window.mountOtherTools();
})();
