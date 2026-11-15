// Pure planning helpers: callers apply the returned records only for a new account.
export const DEFAULT_LAB_GROUPS=Object.freeze(['1.6']);
export function riyadhDate(instant=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant))}
function add(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function planStudent(items,records={},instant=new Date(),selected={},constraints={}){
 const start=riyadhDate(instant),stamp=new Date(instant).toISOString(),out=structuredClone(records),warnings=[],used={},budget=Math.max(0,Number.isFinite(+constraints.budget)?+constraints.budget:180),breaks=constraints.breaks||[],blocked=new Set(constraints.blockedDates||[]),finals=constraints.finals||{};
 const free=d=>!blocked.has(d)&&!breaks.some(([a,b])=>d>=a&&d<=b);
 for(const item of items){const old=records[item.id]||{},done={...(old.done||{})};for(const p of selected[item.id]||[])if([0,1,2].includes(+p)&&!done[p])done[p]=stamp;
  if(old.dates){out[item.id]={...old,done};continue}const dates=[start,start,start];let prior=null;
  for(let p=0;p<3;p++){if(done[p]){prior=riyadhDate(done[p]);continue}let candidate=prior?[start,add(prior,p===1?1:2)].sort().at(-1):start,chosen=null;const final=finals[item.course];for(let i=0;i<366;i++,candidate=add(candidate,1)){if(final&&candidate>=final)break;if(free(candidate)&&(used[candidate]||0)+[40,30,20][p]<=budget){chosen=candidate;break}}
   if(chosen){dates[p]=chosen;prior=chosen;used[chosen]=(used[chosen]||0)+[40,30,20][p]}else{warnings.push({id:item.id,pass:p,reason:final?'No available capacity before the final.':'No available capacity in the planning horizon.'});prior=null}
  }out[item.id]={...old,dates,done};
 }return {records:out,warnings,start};
}
export function newStudentPlan(items,records={},instant=new Date(),selected={},constraints={}){return planStudent(items,records,instant,selected,constraints).records}
