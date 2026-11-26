// Network-aware speculative imports are restricted to authored, public on-demand
// modules. No authenticated JSON, private R2 assets, or student identifiers.
const routeMap={'quiz':'./learning-practice.mjs','grades':'./grade-solver.mjs','booklet':'./phase2-practice.mjs?v=3','practice':'./phase2-practice.mjs?v=3'};
export function canPrefetch(nav,document){
 const c=nav?.connection||nav?.mozConnection||nav?.webkitConnection;
 if(nav?.onLine===false||document?.visibilityState==='hidden'||c?.saveData||['slow-2g','2g','3g'].includes(c?.effectiveType)||Number.isFinite(c?.downlink)&&c.downlink<1.5||Number.isFinite(nav?.deviceMemory)&&nav.deviceMemory<=2)return false;
 return true;
}
export function installAdaptivePrefetch(doc,nav,base){
 if(!doc?.addEventListener||!doc?.head)return {preloaded:()=>[]};
 const loaded=new Set(),limit=2;
 const preload=event=>{
  if(loaded.size>=limit||!canPrefetch(nav,doc))return;
  const control=event.target?.closest?.('[data-learn-tab],[data-view]');
  if(!control)return;
  const mode=control.dataset.learnTab||control.dataset.view,url=routeMap[mode];
  if(!url)return;
  const href=new URL(url,base).href;
  if(loaded.has(href)||doc.querySelector?.('link[rel="modulepreload"][href="'+href+'"]'))return;
  const link=doc.createElement('link');link.rel='modulepreload';link.href=href;link.crossOrigin='anonymous';doc.head.append(link);loaded.add(href);
 };
 doc.addEventListener('pointerover',preload,{passive:true});doc.addEventListener('focusin',preload);
 return {preloaded:()=>[...loaded]};
}
