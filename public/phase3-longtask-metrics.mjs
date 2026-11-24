// Long-task diagnostics are local to the current page. No identifiers, storage or telemetry.
import {createNavigationMetrics} from './phase3-navigation-metrics.mjs';
export function createLongTaskMetrics(){
 const timings=createNavigationMetrics({maxPerView:120,maxViews:24}),history=[];
 function enter(view,startedAt){
  if(typeof view!=='string'||!/^[a-z][a-z-]{0,31}$/.test(view)||!Number.isFinite(startedAt)||startedAt<0)return;
  if(history.length&&startedAt<history.at(-1).start)return;
  if(history.length&&history.at(-1).view===view)return;
  history.push({view,start:startedAt});if(history.length>128)history.shift();
 }
 function record({startTime,duration}={}){
  if(!Number.isFinite(startTime)||startTime<0||!Number.isFinite(duration)||duration<50||duration>60000||!history.length)return false;
  let lo=0,hi=history.length;
  while(lo<hi){const m=(lo+hi)>>>1;if(history[m].start<=startTime)lo=m+1;else hi=m}
  const i=lo-1;if(i<0)return false;
  return timings.record(history[i].view,duration);
 }
 return {enter,record,summary:()=>timings.summary()};
}
