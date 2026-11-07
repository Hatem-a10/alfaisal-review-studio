const plus=(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10);
// Reserve time for every first pass, then for spaced second passes.
export function finalCatchup(assessment,items,records,day,events,capacity,focused=false){
 const {cvpFinalDate,release}=assessment;
 const final=cvpFinalDate(events),state=structuredClone(records),changes=[],omitted=[],unplaced=[];
 const cvp=items.filter(x=>x.course==='CVP'),remaining=new Map(),placed=new Map();
 const datesFor=x=>state[x.id]?.dates||x.dates;
 const completionDay=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
 const otherWork=items.filter(x=>x.course!=='CVP').flatMap(x=>[0,1].filter(p=>!records[x.id]?.done?.[p]).map(p=>({date:datesFor(x)[p],minutes:[40,30,20][p]})));
 for(let date=day;final&&date<final;date=plus(date,1)){
  remaining.set(date,Math.max(0,capacity(date)-otherWork.reduce((sum,t)=>sum+(t.date===date?t.minutes:0),0)));
 }
 const availableDays=[...remaining.keys()],eve=final&&plus(final,-1),secondCounts=new Map();
 function schedule(x,p){
  const r=state[x.id]||{},previous=p>0?(r.done?.[p-1]?completionDay(r.done[p-1]):placed.get(x.id+':'+(p-1))):null;
  if(p>0&&!previous)return false;
  const earliest=[release(x,events),previous?plus(previous,p===1?1:2):day].sort().at(-1);
  const cost=(focused?[30,25,20]:[40,30,20])[p];
  const eligible=availableDays.filter(d=>d>=earliest&&remaining.get(d)>=cost);
  const date=p===1
   ? eligible.filter(d=>d!==eve).sort((a,b)=>(secondCounts.get(a)||0)-(secondCounts.get(b)||0)||a.localeCompare(b))[0]
     || (eligible.includes(eve)&&(secondCounts.get(eve)||0)<2?eve:null)
   : eligible[0];
  if(!date)return false;
  remaining.set(date,remaining.get(date)-cost);
  if(p===1)secondCounts.set(date,(secondCounts.get(date)||0)+1);
  placed.set(x.id+':'+p,date);
  const dates=[...datesFor(x)],before=dates[p];
  if(before!==date){
   dates[p]=date;
   state[x.id]={...r,dates};
   changes.push({id:x.id,field:'dates.'+p,before,after:date});
  }
  return true;
 }
 const lastFirstDay=x=>state[x.id]?.done?.[0]?completionDay(state[x.id].done[0]):placed.get(x.id+':0')||'';
 for(const p of [0,1]){
  const queue=cvp.filter(x=>!state[x.id]?.done?.[p]).sort((a,b)=>datesFor(a)[p].localeCompare(datesFor(b)[p])||a.id.localeCompare(b.id,undefined,{numeric:true}));
  if(p===1)queue.sort((a,b)=>lastFirstDay(b).localeCompare(lastFirstDay(a)));
  for(const x of queue)if(!schedule(x,p))unplaced.push({id:x.id,pass:p,date:datesFor(x)[p],reason:'No study slot before the CVP final.'});
 }
 for(const x of cvp){
  if(state[x.id]?.done?.[2])continue;
  const optional=unplaced.length>0||!schedule(x,2),r=state[x.id]||{};
  if(optional)omitted.push(x.id);
  const finalThirdDate=placed.get(x.id+':2')||null;
  if(!!r.skipThird!==optional){
   state[x.id]={...r,skipThird:optional};
   changes.push({id:x.id,field:'skipThird',before:!!r.skipThird,after:optional});
  }
  if((r.finalThirdDate??null)!==finalThirdDate){
   state[x.id]={...state[x.id],finalThirdDate};
   changes.push({id:x.id,field:'finalThirdDate',before:r.finalThirdDate??null,after:finalThirdDate});
  }
 }
 if(!focused&&unplaced.length){
  const shorter=finalCatchup(assessment,items,records,day,events,capacity,true);
  const firstGap=shorter.unplaced.filter(x=>x.pass===0).length-unplaced.filter(x=>x.pass===0).length;
  if(firstGap<0||(firstGap===0&&shorter.unplaced.length<unplaced.length))return shorter;
 }
 return {records:state,changes,omitted,unplaced,late:[],final,focused,
  firstPlaced:cvp.filter(x=>placed.has(x.id+':0')).length,secondPlaced:cvp.filter(x=>placed.has(x.id+':1')).length};
}

export function finalOverflow(plan,items,done,dates,courseDayTasks){
  if(plan.undone)return '';
  const byId=new Map(items.map(x=>[x.id,x]));
  const pending=(plan.unplaced||[]).filter(u=>u.pass===1&&u.date&&byId.has(u.id))
   .map(u=>({x:byId.get(u.id),p:u.pass,date:u.date}))
   .filter(t=>!done(t.x,t.p)&&dates(t.x)[t.p]===t.date);
  return pending.length?'<details><summary>Second reviews without a slot · '+pending.length+'</summary>'+
   courseDayTasks(pending.map(t=>({...t,unscheduled:true})),'')+'</details>':'';
 }
