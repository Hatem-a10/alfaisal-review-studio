// Compare only figures already exposed by the active study surface. Never fetch another
// question's figure or reveal answer labels on behalf of the user.
export function comparisonIndex(length,primary,requested){
 if(!Number.isSafeInteger(length)||length<2||!Number.isSafeInteger(primary)||primary<0||primary>=length)return -1;
 return Number.isSafeInteger(requested)&&requested>=0&&requested<length&&requested!==primary?requested:(primary+1)%length;
}
function figurePane(viewport,report){
 let figure,width=0,height=0,scale=1,minimum=.02;
 const pointers=new Map();
 function zoom(next,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
  if(!width)return;
  const old=scale,left=viewport.scrollLeft,top=viewport.scrollTop;
  scale=Math.max(minimum,Math.min(6,next));
  figure.style.width=width*scale+'px';figure.style.height=height*scale+'px';
  viewport.scrollTo((left+x)*scale/old-x,(top+y)*scale/old-y);
 }
 function fit(){
  if(!width||!viewport.clientWidth||!viewport.clientHeight)return;
  minimum=Math.max(.02,Math.min(1,viewport.clientWidth/width,viewport.clientHeight/height));
  zoom(minimum);viewport.scrollTo(0,0);
 }
 function clear(){pointers.clear();figure=null;width=height=0;viewport.replaceChildren();}
 function display(source){
  clear();if(!source)return;
  const clone=source.cloneNode(true);
  for(const attr of ['tabindex','role','style','id','srcset','sizes'])clone.removeAttribute(attr);
  clone.style.cssText='display:block;max-width:none;max-height:none;margin:0';
  viewport.replaceChildren(clone);figure=clone;scale=1;minimum=.02;
  const ready=()=>{
   if(figure!==clone)return;
   width=clone.naturalWidth||clone.viewBox?.baseVal.width||0;
   height=clone.naturalHeight||clone.viewBox?.baseVal.height||0;
   report(width&&height?'':'Figure dimensions unavailable.');fit();
  };
  if(clone.tagName.toLowerCase()==='img'){
   report('Loading figure…');
   clone.onload=ready;clone.onerror=()=>{if(figure===clone)report('Figure could not load. Close and retry when connected.')};
   clone.src=source.dataset.fullSrc||source.currentSrc||source.src;
   if(clone.complete&&clone.naturalWidth)ready();
  }else ready();
 }
 const distance=()=>{const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y)};
 viewport.addEventListener('pointerdown',e=>{
  if(pointers.size===2||e.button!==0)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);
 });
 viewport.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  const was=pointers.size===2?distance():0;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(was>0){const [a,b]=pointers.values(),box=viewport.getBoundingClientRect();zoom(scale*distance()/was,(a.x+b.x)/2-box.left,(a.y+b.y)/2-box.top)}
  else{viewport.scrollLeft-=e.clientX-p.x;viewport.scrollTop-=e.clientY-p.y}
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>pointers.delete(e.pointerId));
 viewport.addEventListener('keydown',e=>{
  if(e.key==='+'||e.key==='='){e.preventDefault();zoom(scale*1.3)}
  else if(e.key==='-'){e.preventDefault();zoom(scale/1.3)}
  else if(e.key==='Home'){e.preventDefault();fit()}
 });
 return {display,clear,fit,step:direction=>zoom(scale*(direction>0?1.3:1/1.3))};
}
export function installImageZoom(){
 if(document.getElementById('phase2ImageZoom'))return;
 const dialog=document.createElement('dialog');
 dialog.id='phase2ImageZoom';dialog.setAttribute('aria-label','Question figure zoom and comparison');
 dialog.innerHTML='<div class="phase2-zoom-toolbar"><strong>Study figures</strong><button type="button" data-zoom="previous" aria-label="Previous figure">‹</button><button type="button" data-zoom="next" aria-label="Next figure">›</button><button type="button" data-zoom="compare" aria-pressed="false" hidden>Compare</button><button type="button" data-zoom="contrast" aria-pressed="false">Light background</button><button type="button" data-zoom="close" aria-label="Close figure">✕</button></div><div class="phase2-zoom-panes"><section class="phase2-zoom-pane"><div class="phase2-zoom-controls"><strong data-primary-label></strong><button type="button" data-pane="primary" data-zoom="out" aria-label="Zoom out first figure">−</button><button type="button" data-pane="primary" data-zoom="fit">Reset</button><button type="button" data-pane="primary" data-zoom="in" aria-label="Zoom in first figure">+</button></div><p data-primary-status role="status"></p><div class="phase2-zoom-viewport" data-primary tabindex="0" aria-label="Pan first figure; plus and minus zoom"></div></section><section class="phase2-zoom-pane" data-compare-pane hidden><div class="phase2-zoom-controls"><label>Compare with <select data-compare-select aria-label="Comparison figure"></select></label><button type="button" data-pane="secondary" data-zoom="out" aria-label="Zoom out comparison figure">−</button><button type="button" data-pane="secondary" data-zoom="fit">Reset</button><button type="button" data-pane="secondary" data-zoom="in" aria-label="Zoom in comparison figure">+</button></div><p data-secondary-status role="status"></p><div class="phase2-zoom-viewport" data-secondary tabindex="0" aria-label="Pan comparison figure; plus and minus zoom"></div></section></div>';
 document.body.append(dialog);
 const q=s=>dialog.querySelector(s),compare=q('[data-zoom=compare]'),contrast=q('[data-zoom=contrast]'),picker=q('[data-compare-select]'),other=q('[data-compare-pane]');
 const primary=figurePane(q('[data-primary]'),message=>q('[data-primary-status]').textContent=message);
 const secondary=figurePane(q('[data-secondary]'),message=>q('[data-secondary-status]').textContent=message);
 const selector='#xpExam img.xp-question-image,#xpExam .xp-toolkit img,#xpExam img.xp-attachment-image,#xpExam img[data-question-figure],#xpExam .xp-figure-viewport img,.phase2-booklet [data-question-id] img';
 let figures=[],index=0,second=-1,previous,comparing=false;
 const label=i=>'Figure '+(i+1)+' of '+figures.length;
 function comparison(){
  second=comparisonIndex(figures.length,index,second);
  comparing=comparing&&second>=0;other.hidden=!comparing;compare.setAttribute('aria-pressed',String(comparing));
  dialog.classList.toggle('phase2-compare-active',comparing);
  if(!comparing){secondary.clear();primary.fit();return;}
  picker.replaceChildren();
  figures.forEach((_,i)=>{if(i!==index)picker.add(new Option(label(i),String(i)))});
  picker.value=String(second);secondary.display(figures[second]);primary.fit();
 }
 function display(){
  q('[data-primary-label]').textContent=label(index);primary.display(figures[index]);
  for(const key of ['next','previous','compare'])q('[data-zoom='+key+']').hidden=figures.length<2;
  comparison();
 }
 window.reviewOpenStudyFigure=(sources,opener=document.activeElement)=>{
  if(dialog.open)return;
  figures=[...new Set((Array.isArray(sources)?sources:[sources]).filter(node=>['img','svg'].includes(node?.tagName?.toLowerCase())))];
  if(!figures.length)return;
  const selected=figures.indexOf(opener);index=selected<0?0:selected;second=-1;previous=opener;comparing=false;
  const light=document.documentElement.dataset.theme==='amoled';
  dialog.classList.toggle('phase2-light-figures',light);contrast.setAttribute('aria-pressed',String(light));
  dialog.showModal();display();q('[data-zoom=close]').focus({preventScroll:true});
 };
 dialog.addEventListener('click',e=>{
  const button=e.target.closest('[data-zoom]'),action=button?.dataset.zoom;
  if(action==='close')dialog.close();
  if(action==='compare'){comparing=!comparing;comparison()}
  if(action==='contrast'){const on=dialog.classList.toggle('phase2-light-figures');contrast.setAttribute('aria-pressed',String(on))}
  const pane=button?.dataset.pane==='secondary'?secondary:primary;
  if(action==='fit')pane.fit();
  if(action==='in'||action==='out')pane.step(action==='in'?1:-1);
  if(action==='next'||action==='previous'){index=(index+figures.length+(action==='next'?1:-1))%figures.length;display()}
 });
 picker.addEventListener('change',()=>{second=Number(picker.value);secondary.display(figures[second])});
 dialog.addEventListener('close',()=>{primary.clear();secondary.clear();figures=[];if(previous?.isConnected)previous.focus?.({preventScroll:true});previous=null});
 window.addEventListener('resize',()=>{if(dialog.open){primary.fit();if(comparing)secondary.fit()}});
 function enhance(){
  for(const image of document.querySelectorAll(selector)){
   if(image.closest('button,a')||image.hasAttribute('data-common-zoom'))continue;
   image.dataset.commonZoom='';image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label','Enlarge '+(image.alt||'question figure'));
  }
 }
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 const activate=e=>{
  const image=e.target.closest?.(selector);if(!image)return;
  // Keep strict exam questions independent; do not include other exam questions.
  const group=image.closest('.phase2-booklet [data-question-id],#xpExam .xp-figure-viewport');
  const visible=group?[...group.querySelectorAll('img')].filter(n=>n.getClientRects().length&&!n.closest('[hidden],[aria-hidden="true"]')):[image];
  e.preventDefault();e.stopImmediatePropagation();window.reviewOpenStudyFigure(visible.includes(image)?visible:[image],image);
 };
 window.addEventListener('click',activate,true);
 window.addEventListener('keydown',e=>{if(!e.defaultPrevented&&!e.isComposing&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&['Enter',' '].includes(e.key))activate(e)},true);
}
