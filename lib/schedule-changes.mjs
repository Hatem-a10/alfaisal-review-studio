const audience=(event,profile)=>['studentGroup','studentSection','labGroup'].every(key=>!event[key]||event[key]===profile[key]);
const fields=['date','day','startTime','endTime','room','studentGroup','studentSection','labGroup'];
const details=event=>Object.fromEntries(fields.filter(key=>event[key]).map(key=>[key,event[key]]));
// Each side of a change is disclosed only if the student can see that event.
export function scheduleChanges(previous,current,profile,today){
 const prior=new Map(previous.map(event=>[event.id,event]));
 return current.flatMap(event=>{
  const before=prior.get(event.id)||prior.get(event.replacesId);
  if(!before||event.date&&event.date<today||!fields.some(key=>(before[key]||'')!==(event[key]||'')))return [];
  const oldVisible=audience(before,profile),newVisible=audience(event,profile);
  if(!oldVisible&&!newVisible)return [];
  return [{id:event.id,title:newVisible?event.title:before.title,previous:oldVisible?details(before):null,next:newVisible?details(event):null}];
 }).slice(0,25);
}
