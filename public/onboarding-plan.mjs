import {renalPlanPreview} from './study-next-core.mjs';
// Pure planning helpers: callers apply the returned records only for a new account.
export const DEFAULT_LAB_GROUPS=Object.freeze(['1.6']);
export function riyadhDate(instant=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant))}
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
function add(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
const array=v=>Array.isArray(v)?v:[];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const validId=v=>typeof v==='string'&&v.length>0&&!['__proto__','constructor','prototype'].includes(v);
const minutes=[40,30,20];
function completedDay(value){if(typeof value!=='string'||!value.trim()||!Number.isFinite(Date.parse(value)))return null;try{return riyadhDate(value)}catch{return null}}
export function addCompletedReviews(items,records={},selected={},instant=new Date()){
 const next={...object(records)},stamp=new Date(instant).toISOString();
 for(const item of array(items)){
  if(!validId(item?.id))continue;
  const old=object(next[item.id]),done={...object(old.done)};
  let changed=false;
  for(const pass of array(selected?.[item.id])){
   if(![0,1,2].includes(pass)||done[pass])continue;
   done[pass]=stamp;changed=true;
  }
  if(changed)next[item.id]={...old,done};
 }
 return next;
}
export function planStudent(items,records={},instant=new Date(),selected={},constraints={}){
 records=object(records);selected=object(selected);constraints=object(constraints);
 const start=riyadhDate(instant),stamp=new Date(instant).toISOString(),out=structuredClone(records),warnings=[],used=new Map(),seen=new Set(),entries=[];
 const rawBudget=constraints.budget,parsed=typeof rawBudget==='number'||typeof rawBudget==='string'&&rawBudget.trim()!==''?Number(rawBudget):NaN;
 const budget=Math.max(0,Number.isFinite(parsed)?parsed:180),breaks=array(constraints.breaks).filter(v=>Array.isArray(v)&&v.length===2&&validDay(v[0])&&validDay(v[1])&&v[0]<=v[1]),blocked=new Set(array(constraints.blockedDates).filter(validDay)),finals=object(constraints.finals),horizon=add(start,365),generated=new Map();
 for(const c of array(constraints.bootstrapChanges))if(validId(c?.id)&&/^dates\.[012]$/.test(c.field)&&validDay(c.after)){const rows=generated.get(c.id)||[];rows.push(c);generated.set(c.id,rows)}
 const free=d=>!blocked.has(d)&&!breaks.some(([a,b])=>d>=a&&d<=b);
 const reserve=(date,pass)=>{if(validDay(date)&&date>=start&&date<=horizon)used.set(date,(used.get(date)||0)+minutes[pass])};
 for(const item of array(items)){
  if(!validId(item?.id)||seen.has(item.id))continue;seen.add(item.id);
  const old=object(records[item.id]),done={...object(old.done)};
  for(const p of array(selected[item.id]))if((typeof p==='number'||typeof p==='string'&&/^[012]$/.test(p))&&[0,1,2].includes(Number(p))&&!done[Number(p)])done[Number(p)]=stamp;
  const changes=generated.get(item.id)||[],bootstrapDates=Array.isArray(old.dates)&&old.dates.length===3&&changes.length>0&&old.dates.every((date,p)=>date===item.dates?.[p]||changes.some(c=>c.field==='dates.'+p&&c.after===date));
  const preserve=old.dates!==undefined&&!bootstrapDates;
  if(preserve){out[item.id]={...old,done};for(let p=0;p<3;p++)if(!done[p])reserve(old.dates?.[p],p)}
  else entries.push({item,old,done});
 }
 for(const {item,old,done} of entries){
  const dates=[start,start,start],fallback=Array.isArray(item.dates)&&item.dates.length===3&&item.dates.every(validDay)?item.dates:null;let prior=null,unplaced=false;const allocations=[];
  for(let p=0;p<3;p++){
   if(done[p]){prior=completedDay(done[p])||prior;dates[p]=validDay(old.dates?.[p])?old.dates[p]:prior||start;continue}
   let candidate=prior?[start,add(prior,p===1?1:2)].sort().at(-1):start,chosen=null;const final=validDay(finals[item.course])?finals[item.course]:null;
   for(;candidate<=horizon;candidate=add(candidate,1)){if(final&&candidate>=final)break;if(free(candidate)&&(used.get(candidate)||0)+minutes[p]<=budget){chosen=candidate;break}}
   if(chosen){dates[p]=chosen;prior=chosen;reserve(chosen,p);allocations.push([chosen,p])}
   else{unplaced=true;if(fallback)dates[p]=fallback[p];warnings.push({id:item.id,pass:p,reason:final?'No available capacity before the final.':'No available capacity in the planning horizon.'});prior=null}
  }
  const unscheduled=unplaced&&!fallback&&item.course==='REN';
  if(unscheduled)for(const [date,pass] of allocations)used.set(date,Math.max(0,(used.get(date)||0)-minutes[pass]));
  out[item.id]={...old,dates:unscheduled?[]:dates,done};
 }
 return {records:out,warnings,start};
}
export function newStudentPlan(items,records={},instant=new Date(),selected={},constraints={}){return planStudent(items,records,instant,selected,constraints).records}

/* Explicit onboarding choice: leave REN unscheduled, or plan released lessons
 * against the verified group timetable. Other courses retain existing behavior. */
export function planOnboardingWithRenalChoice(items,records,instant,selected,constraints={}){
 const renal=items.filter(item=>item.course==='REN'),other=items.filter(item=>item.course!=='REN');
 const planned=planStudent(other,records,instant,selected,constraints);
 planned.records=addCompletedReviews(renal,planned.records,selected,instant);
 if(constraints.renalChoice!=='schedule'||!renal.length)return planned;
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const part=type=>Number(clock.find(p=>p.type===type)?.value);
 const start=riyadhDate(instant),minute=part('hour')*60+part('minute');
 const tasks=items.flatMap(item=>[0,1,2].map(p=>({p,date:(planned.records[item.id]?.dates??item.dates??[])[p],done:planned.records[item.id]?.done?.[p]})));
 const blocked=new Set(array(constraints.blockedDates));
 const breaks=array(constraints.breaks).filter(b=>Array.isArray(b)&&validDay(b[0])&&validDay(b[1])&&b[0]<=b[1]);
 for(let d=start,i=0;i<365;i++,d=add(d,1))if(breaks.some(([a,b])=>d>=a&&d<=b))blocked.add(d);
 const raw=constraints.budget,parsed=typeof raw==='number'||typeof raw==='string'&&raw.trim()?Number(raw):NaN;
 const preview=renalPlanPreview(renal,planned.records,{events:array(constraints.renalEvents),group:constraints.studentGroup,section:constraints.studentSection,date:start,minute,minutes:Number.isFinite(parsed)?Math.min(720,parsed):180,tasks,blockedDates:[...blocked]});
 for(const row of preview.plans)planned.records[row.id]={...planned.records[row.id],dates:row.dates};
 const warn=preview.error?renal.filter(item=>!(planned.records[item.id]?.dates??item.dates??[]).length).map(item=>item.id):preview.unplaced;
 for(const id of warn)for(let p=0;p<3;p++)if(!planned.records[id]?.done?.[p])planned.warnings.push({id,pass:p,reason:preview.error?'Verified Renal schedule or study capacity unavailable.':'No available capacity before the Renal final.'});
 return planned;
}
