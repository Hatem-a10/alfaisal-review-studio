// A5-013: start downloading independent, critical navigation modules while
// the reading and update scripts initialize. Evaluation order stays sequential.
export const criticalModules=['./mobile-dock.js?v=1498','./studio-navigation.js?v=1498'];
export function preloadCriticalModules(doc,base,connection){
 if(!doc?.head||connection?.saveData||['2g','slow-2g'].includes(connection?.effectiveType))return [];
 const created=[];
 for(const source of criticalModules){
  const href=new URL(source,base).href;
  if(doc.querySelector?.('link[rel="modulepreload"][href="'+href+'"]'))continue;
  const link=doc.createElement('link');link.rel='modulepreload';link.href=href;doc.head.append(link);created.push(link);
 }
 return created;
}
