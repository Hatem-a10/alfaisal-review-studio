/* Restore keyboard focus when a native modal closes. Never intercept Escape or
 * override showModal; the browser retains focus trapping and cancel behavior. */
(function(){
 const returnTargets=new WeakMap();let mostRecentTrigger=null,lastOutsideFocus=null;
 const valid=el=>el&&el.isConnected&&typeof el.focus==='function'&&!el.closest?.('dialog[open],[inert],[aria-hidden="true"]')&&!el.disabled;
 const restore=(dialog)=>{
  const preferred=returnTargets.get(dialog);
  const target=valid(preferred)?preferred:valid(mostRecentTrigger)?mostRecentTrigger:valid(lastOutsideFocus)?lastOutsideFocus:null;
  if(target){try{target.focus({preventScroll:true})}catch{target.focus()}}
  returnTargets.delete(dialog);
 };
 function opened(dialog){
  if(!dialog.open||returnTargets.has(dialog))return;
  const active=document.activeElement,opener=valid(active)?active:valid(mostRecentTrigger)?mostRecentTrigger:lastOutsideFocus;
  if(opener&&!dialog.contains(opener))returnTargets.set(dialog,opener);
  // Native showModal() already chooses a valid initial focus. Only repair a
  // missing focus when the browser leaves it outside the open modal.
  if(dialog.matches?.(':modal')&&active&&!dialog.contains(active)){
   const target=dialog.querySelector('[autofocus],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')||dialog;
   if(target===dialog&&!dialog.hasAttribute('tabindex'))dialog.setAttribute('tabindex','-1');
   try{target.focus({preventScroll:true})}catch{target.focus?.()}
  }
 }
 document.addEventListener('pointerdown',e=>{
  const control=e.target.closest?.('button,a[href],input,select,[role="button"]');
  if(control&&!control.closest('dialog')&&valid(control))mostRecentTrigger=control;
 },true);
 document.addEventListener('focusin',e=>{
  if(!e.target.closest?.('dialog[open]')&&valid(e.target))lastOutsideFocus=e.target;
 },true);
 document.addEventListener('close',e=>{if(e.target.tagName==='DIALOG')queueMicrotask(()=>restore(e.target))},true);
 const observe=new MutationObserver(entries=>{
  for(const entry of entries){
   if(entry.type==='attributes'&&entry.target.tagName==='DIALOG'&&entry.attributeName==='open')opened(entry.target);
   if(entry.type==='childList')for(const node of entry.addedNodes){
    if(node.nodeType!==1)continue;
    if(node.tagName==='DIALOG')opened(node);
    for(const dialog of node.querySelectorAll?.('dialog[open]')||[])opened(dialog);
   }
  }
 });
 observe.observe(document.documentElement,{attributes:true,attributeFilter:['open'],childList:true,subtree:true});
 for(const dialog of document.querySelectorAll('dialog[open]'))opened(dialog);
})();
