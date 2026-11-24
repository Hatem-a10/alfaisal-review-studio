export function installImageZoom(){
 if(document.getElementById('phase2ImageZoom'))return;
 const dialog=document.createElement('dialog');
 dialog.id='phase2ImageZoom';dialog.setAttribute('aria-label','Question figure zoom');
 dialog.innerHTML='<div class="phase2-zoom-toolbar"><strong>Question figure</strong><button type="button" data-zoom="previous" aria-label="Previous figure">‹</button><button type="button" data-zoom="next" aria-label="Next figure">›</button><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="fit">Reset</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="close" aria-label="Close figure">✕</button></div><p role="status"></p><div class="phase2-zoom-viewport" tabindex="0" aria-label="Pan figure"></div>';
 document.body.append(dialog);
 const viewport=dialog.querySelector('.phase2-zoom-viewport'),status=dialog.querySelector('[role=status]');
 const selector='#xpExam img.xp-question-image,#xpExam .xp-toolkit img,#xpExam img.xp-attachment-image,#xpExam img[data-question-figure],#xpExam .xp-figure-viewport img,.phase2-booklet [data-question-id] img';
 let figures=[],index=0,figure,previous,scale=1,minimum=1,width=0,height=0;
 const pointers=new Map();
 function zoom(next,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
  if(!width)return;
  const old=scale,left=viewport.scrollLeft,top=viewport.scrollTop;
  scale=Math.max(minimum,Math.min(6,next));
  figure.style.width=width*scale+'px';figure.style.height=height*scale+'px';
  viewport.scrollTo((left+x)*scale/old-x,(top+y)*scale/old-y);
 }
 function fit(){
  if(!width)return;
  minimum=Math.max(.02,Math.min(1,viewport.clientWidth/width,viewport.clientHeight/height));
  zoom(minimum);viewport.scrollTo(0,0);
 }
 function display(){
  const source=figures[index];
  const clone=source.cloneNode(true);
  clone.removeAttribute('tabindex');clone.removeAttribute('role');clone.removeAttribute('style');
  clone.style.cssText='display:block;max-width:none;max-height:none;margin:0';
  viewport.replaceChildren(clone);figure=clone;width=height=0;scale=1;minimum=.02;
  const ready=()=>{
   if(figure!==clone)return;
   width=clone.naturalWidth||clone.viewBox?.baseVal.width;
   height=clone.naturalHeight||clone.viewBox?.baseVal.height;
   status.textContent=figures.length>1?'Figure '+(index+1)+' of '+figures.length:'';
   fit();
  };
  if(clone.tagName.toLowerCase()==='img'){
   status.textContent='Loading figure…';
   clone.onload=ready;clone.onerror=()=>{if(figure===clone)status.textContent='Figure could not load. Close and retry when connected.'};
   clone.src=source.dataset.fullSrc||source.currentSrc||source.src;
   if(clone.complete&&clone.naturalWidth)ready();
  }else ready();
  for(const key of ['next','previous'])dialog.querySelector('[data-zoom='+key+']').hidden=figures.length<2;
 }
 window.reviewOpenStudyFigure=(sources,opener=document.activeElement)=>{
  figures=(Array.isArray(sources)?sources:[sources]).filter(Boolean);
  if(!figures.length||dialog.open)return;
  index=0;previous=opener;dialog.showModal();display();
  dialog.querySelector('[data-zoom=close]').focus({preventScroll:true});
 };
 dialog.addEventListener('click',e=>{
  const action=e.target.closest('[data-zoom]')?.dataset.zoom;
  if(action==='close')dialog.close();
  if(action==='fit')fit();
  if(action==='in'||action==='out')zoom(scale*(action==='in'?1.3:1/1.3));
  if(action==='next'||action==='previous'){index=(index+figures.length+(action==='next'?1:-1))%figures.length;display();}
 });
 dialog.addEventListener('close',()=>{pointers.clear();figure=null;viewport.replaceChildren();if(previous?.isConnected)previous.focus?.({preventScroll:true});});
 const distance=()=>{const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y);};
 viewport.addEventListener('pointerdown',e=>{
  if(pointers.size===2||e.button!==0)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);
 });
 viewport.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  const was=pointers.size===2?distance():0;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(was>0){
   const [a,b]=pointers.values(),box=viewport.getBoundingClientRect();
   zoom(scale*distance()/was,(a.x+b.x)/2-box.left,(a.y+b.y)/2-box.top);
  }else{viewport.scrollLeft-=e.clientX-p.x;viewport.scrollTop-=e.clientY-p.y;}
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>pointers.delete(e.pointerId));
 window.addEventListener('resize',()=>{if(dialog.open)fit();});
 function enhance(){
  for(const image of document.querySelectorAll(selector)){
   if(image.closest('button,a')||image.hasAttribute('data-common-zoom'))continue;
   image.dataset.commonZoom='';image.tabIndex=0;image.setAttribute('role','button');
   image.setAttribute('aria-label','Enlarge '+(image.alt||'question figure'));
  }
 }
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 const activate=e=>{
  const image=e.target.closest?.(selector);if(!image)return;
  e.preventDefault();e.stopImmediatePropagation();window.reviewOpenStudyFigure(image,image);
 };
 window.addEventListener('click',activate,true);
 window.addEventListener('keydown',e=>{if(!e.defaultPrevented&&!e.isComposing&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&['Enter',' '].includes(e.key))activate(e);},true);
}
