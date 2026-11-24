import {createNavigationMetrics} from './phase3-navigation-metrics.mjs';
// Bounded, in-memory view-level long-task durations. Never records task attributes or user data.
export function createLongTaskMetrics({getView,Observer=globalThis.PerformanceObserver,maxPerView=120,maxViews=24}={}){
 const metrics=createNavigationMetrics({maxPerView,maxViews});let observer=null;
 function start(){
  if(observer||typeof Observer!=='function'||typeof getView!=='function')return false;
  try{
   const instance=new Observer(list=>{
    const view=getView();
    for(const entry of list.getEntries())if(entry?.entryType==='longtask')metrics.record(view,entry.duration);
   });
   instance.observe({type:'longtask'});
   observer=instance;return true;
  }catch{observer=null;return false}
 }
 function stop(){observer?.disconnect();observer=null}
 return {start,stop,summary:metrics.summary};
}
