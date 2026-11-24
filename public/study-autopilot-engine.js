'use strict';
/* Pure date planning and field-level reconciliation; never manufacture completion. */
const StudyAutopilot=(()=>{
 const time=v=>typeof v==='string'&&v.trim()&&Number.isFinite(Date.parse(v))?Date.parse(v):0;
 const plus=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
 const own=(v,k)=>!!v&&Object.hasOwn(v,k),safeKey=k=>!['__proto__','prototype','constructor'].includes(k);
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const array=v=>Array.isArray(v)?v:[];
 // Only valid during a single synchronous planning run; account/calendar changes start a new cache.
 function memoCapacity(read){const cache=new Map();return (date,after=0)=>{const key=date+'|'+after;if(cache.has(key))return cache.get(key);const result=read(date,after);cache.set(key,result);return result}}
 function equal(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const ka=Object.keys(a),kb=Object.keys(b);
  return ka.length===kb.length&&ka.every(k=>own(b,k)&&equal(a[k],b[k]));
 }
 function stampChanges(before,after,at){
  if(!time(at))return after;
  for(const[id,r]of Object.entries(object(after))){
   if(!safeKey(id)||!r||typeof r!=='object')continue;
   const old=object(before?.[id]);r._changed={...object(r._changed)};
   for(const k of new Set([...Object.keys(old),...Object.keys(r)])){
    if(k==='_changed'||!safeKey(k))continue;
    if(k==='dates'||k==='done'){for(let p=0;p<3;p++)if(!equal(old[k]?.[p],r[k]?.[p]))r._changed[k+'.'+p]=at}
    else if(!equal(old[k],r[k]))r._changed[k]=at;
   }
  }
  return after;
 }
 function evidence(r){
  let latest=0;
  const add=value=>{latest=Math.max(latest,time(value))};
  for(const at of Object.values(object(r?.done)))add(at);
  for(const x of array(r?.learning?.attempts))add(x?.at);
  for(const x of Object.values(object(r?.learning?.results)))add(x?.at);
  for(const x of array(r?.mcqs))add(x?.createdAt);
  for(const x of array(r?.sessions))add(x?.endedAt);
  return latest;
 }
 const clock=(r,k)=>time(r?._changed?.[k]);
 function preferRemote(a,b,k,fa,fb){const ta=clock(a,k),tb=clock(b,k);return tb>ta||(!ta&&!tb&&fb>fa)}
 function retainClock(target,a,b,k){const ta=clock(a,k),tb=clock(b,k);if(ta||tb)target[k]=ta>=tb?a._changed[k]:b._changed[k]}
 function mergeRecords(local,remote,localAt,remoteAt,mergeBase){
  const out=mergeBase(local,remote);
  for(const id of new Set([...Object.keys(local),...Object.keys(remote)])){
   if(!safeKey(id))continue;
   const a=local[id],b=remote[id];if(!a||!b)continue;
   const c=out[id];c._changed={...object(a._changed)};
   const fallbackA=Math.max(evidence(a),time(localAt)),fallbackB=Math.max(evidence(b),time(remoteAt));
   for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
    if(['_changed','learning','mcqs','sessions'].includes(key)||!safeKey(key))continue;
    if(key==='done'||key==='dates'){
     const aDates=Array.isArray(a.dates)?a.dates:null,bDates=Array.isArray(b.dates)?b.dates:null;
     if(key==='dates'&&aDates&&bDates&&(!aDates.length)!==(!bDates.length)){
      const ta=Math.max(...[0,1,2].map(p=>clock(a,'dates.'+p))),tb=Math.max(...[0,1,2].map(p=>clock(b,'dates.'+p)));
      const chosen=tb>ta||(!ta&&!tb&&fallbackB>fallbackA)?b:a;
      c.dates=[...chosen.dates];
      // An empty schedule is an atomic intentional unscheduling operation.
      const newest=[0,1,2].map(p=>chosen._changed?.['dates.'+p]).filter(t=>time(t)).sort((a,b)=>time(b)-time(a))[0];
      for(let p=0;p<3;p++){const k='dates.'+p;if(newest)c._changed[k]=newest;else delete c._changed[k]}
      continue;
     }
     c[key]=key==='dates'?[]:{};
     for(let p=0;p<3;p++){
      const k=key+'.'+p,ta=clock(a,k),tb=clock(b,k);
      let useB=preferRemote(a,b,k,fallbackA,fallbackB);
      if(key==='done'&&!ta&&!tb){const va=a.done?.[p],vb=b.done?.[p];useB=!!vb&&(!va||time(vb)>time(va))}
      const chosen=useB?b:a,other=useB?a:b;
      if(own(chosen[key],p))c[key][p]=chosen[key][p];
      else if(key==='done'&&clock(chosen,k)>0)c.done[p]=null;
      else if(own(other[key],p))c[key][p]=other[key][p];
      retainClock(c._changed,a,b,k);
     }
     continue;
    }
    const pick=preferRemote(a,b,key,fallbackA,fallbackB)?b:a,other=pick===a?b:a;
    if(own(pick,key))c[key]=structuredClone(pick[key]);
    else if(clock(pick,key))delete c[key];
    else if(own(other,key))c[key]=structuredClone(other[key]);
    retainClock(c._changed,a,b,key);
   }
  }
  return out;
 }
 function thirdOptional(record,course,date,day,final){
  if(record.done?.[2])return false;
  if(final&&day<final&&day>=plus(final,-14)){
   return course!=='CVP'||record.finalThirdDate!==date||date<day||date>=final||!!record.skipThird;
  }
  return !!record.skipThird;
 }
 function restoreThird(r,mastered,accuracy){return !!r.skipThird&&!r.done?.[2]&&(!mastered||r.difficult||(r.confidence>0&&r.confidence<4)||(accuracy!==null&&accuracy<85))}
 function firstStudyAt(r,passed,at){if(!passed||r.done?.[0]||!time(at)||time(at)<=time(r.masteryHandledAt))return null;if(r.done?.[0]===null&&time(r._changed?.['done.0'])>=time(at))return null;return at}
 function mergeSettings(a,b,localAt,remoteAt){
  const c={...a,_changed:{...object(a._changed)}};
  for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
   if(k==='_changed'||!safeKey(k))continue;
   const pick=preferRemote(a,b,k,time(localAt),time(remoteAt))?b:a,other=pick===a?b:a;
   if(own(pick,k))c[k]=structuredClone(pick[k]);
   else if(clock(pick,k))delete c[k];
   else if(own(other,k))c[k]=structuredClone(other[k]);
   retainClock(c._changed,a,b,k);
  }
  return c;
 }
 function cvpFinal(events){
  if(typeof AssessmentPlan!=='undefined')return AssessmentPlan.cvpFinalDate(events);
  return events.filter(e=>!e.hubCustom&&/^CVP\b.*\bfinal\b/i.test(e.title||'')).map(e=>e.date).sort()[0]||null;
 }
 function deadline(item,events,day){if(typeof AssessmentPlan!=='undefined'){const c=assessmentClock(),a=AssessmentPlan.target(item,AssessmentPlan.catalog(events,[item]),day,c.date===day?c.minute:0);if(a)return a.date}const n=Number(item.id.split('-').pop().replace(/\D/g,''));return events.filter(e=>e.date>=day&&/exam|final|mid\s*term|tbl/i.test(e.title||'')).filter(e=>{const text=(e.title||'')+' '+(e.detail||'');if(!text.includes(item.course))return false;if(/tbl/i.test(e.title||'')){const m=(e.detail||'').match(/MOL\s*(\d+)\s*[–-]\s*(\d+)/i);return item.course==='MOL'&&m&&n>=+m[1]&&n<=+m[2]}return true}).map(e=>e.date).sort()[0]||plus(day,29)}
 function rebalance(items,records,day,settings,events,isMastered,capacity){const final=cvpFinal(events);items=items.filter(x=>x.course!=='CVP'||!final||day<final);const active=items.flatMap(x=>[0,1,2].filter(p=>!records[x.id]?.done?.[p]&&!(p===2&&records[x.id]?.skipThird)).map(p=>({x,p,date:(records[x.id]?.dates||x.dates)[p]}))),over=active.filter(t=>t.date<day),budget=(settings.budget!==null&&settings.budget!==''&&Number.isFinite(Number(settings.budget))?Math.max(0,Number(settings.budget)):180);
 if(over.length<6&&over.reduce((n,t)=>n+[35,25,15][t.p],0)<=budget*1.5)return null;
 const state=structuredClone(records),changes=[],omitted=[];const affected=new Set(over.map(t=>t.x.id));
 for(const x of items.filter(x=>affected.has(x.id))){const r=state[x.id]||{};if(r.done?.[0]&&r.done?.[1]&&!r.done?.[2]&&isMastered(x)&&!settings.hard?.(x)&&(!settings.canSkip||settings.canSkip(x))&&!r.difficult&&!(r.confidence>0&&r.confidence<4)&&!r.skipThird){r.skipThird=true;state[x.id]=r;omitted.push(x.id);changes.push({id:x.id,field:'skipThird',before:records[x.id]?.skipThird??false,after:true})}}
 const pending=new Map();for(const x of items.filter(x=>affected.has(x.id))){const r=state[x.id]||{};pending.set(x.id,{x,passes:[0,1,2].filter(p=>!r.done?.[p]&&!(p===2&&r.skipThird)),last:null,limit:plus([deadline(x,events,day),x.course==='CVP'?final:null].filter(Boolean).sort()[0],-1)})}
 const unplaced=[];for(let i=0;i<28;i++){const date=plus(day,i);let remaining=capacity(date);for(const t of active.filter(t=>!affected.has(t.x.id)&&t.date===date))remaining-=([35,25,15][t.p]+5);
 while(remaining>=15){const eligible=[...pending.values()].filter(v=>{if(!v.passes.length||date>v.limit)return false;const p=v.passes[0],r=state[v.x.id]||{},previous=p>0?(v.last||r.done?.[p-1]?.slice(0,10)):null,earliest=previous?plus(previous,p===1?1:2):day;const original=(r.dates||v.x.dates)[p];return date>=earliest&&(original<day||p===0||v.last||date>=original)}).sort((a,b)=>{const score=v=>(v.limit<=plus(day,3)?100:0)+(settings.hard?.(v.x)?30:0)+(isMastered(v.x)?0:25)+(v.passes[0]===0?60:v.passes[0]===1?30:0);return score(b)-score(a)||a.limit.localeCompare(b.limit)||((state[a.x.id]?.dates||a.x.dates)[a.passes[0]]).localeCompare((state[b.x.id]?.dates||b.x.dates)[b.passes[0]])||a.x.id.localeCompare(b.x.id,undefined,{numeric:true})});
 const v=eligible.find(v=>[35,25,15][v.passes[0]]+5<=remaining);if(!v)break;const p=v.passes.shift(),r=state[v.x.id]||{},dates=[...(r.dates||v.x.dates)],before=dates[p];dates[p]=date;r.dates=dates;state[v.x.id]=r;if(before!==date)changes.push({id:v.x.id,field:'dates.'+p,before,after:date});v.last=date;remaining-=[35,25,15][p]+5;
 }}
 for(const v of pending.values())if(v.passes.some(p=>p<2)){const reverted=changes.filter(c=>c.id===v.x.id&&c.field.startsWith('dates.'));for(const c of reverted){state[c.id].dates[+c.field.split('.')[1]]=c.before;unplaced.push({id:c.id,pass:+c.field.split('.')[1]})}for(const p of v.passes)unplaced.push({id:v.x.id,pass:p})}for(const v of pending.values())if(v.passes.length===1&&v.passes[0]===2)unplaced.push({id:v.x.id,pass:2});for(let i=changes.length-1;i>=0;i--)if([...pending.values()].some(v=>v.x.id===changes[i].id&&v.passes.some(p=>p<2))&&changes[i].field.startsWith('dates.'))changes.splice(i,1);return {records:state,changes,omitted,unplaced,overdue:over.length};}
 // Automatic catch-up is threshold-gated. Routine lateness, reloads and sync do not reset dates.
 function automaticRebalance(items,records,day,settings,events,isMastered,capacity,options={}){
  if(!options.ready||options.enabled===false||options.undoDay===day||options.lastPlanDay===day||options.lastAttemptDay===day)return null;
  return rebalance(items,records,day,settings,events,isMastered,capacity);
 }
 // Retained for an explicitly requested full reset; never called by automatic catch-up.
 function freshPlan(items,records,day,settings,events,isMastered,capacity){
 const state=structuredClone(records),changes=[],omitted=[],late=[],capacityShortfall=[],unplaced=[],pending=new Map(),final=cvpFinal(events);
 items=items.filter(x=>x.course!=='CVP'||!final||day<final);
 for(const x of items){const r=state[x.id]||{};state[x.id]=r;if(r.done?.[0]&&r.done?.[1]&&!r.done?.[2]&&!r.skipThird&&isMastered(x)&&!settings.hard?.(x)&&(!settings.canSkip||settings.canSkip(x))&&!r.difficult&&!(r.confidence>0&&r.confidence<4)){r.skipThird=true;omitted.push(x.id);changes.push({id:x.id,field:'skipThird',before:false,after:true})}
 const due=deadline(x,events,day),known=events.some(e=>e.date===due&&((e.title||'')+' '+(e.detail||'')).includes(x.course)&&/exam|final|mid.?term|tbl/i.test(e.title||''));pending.set(x.id,{x,passes:[0,1,2].filter(p=>!r.done?.[p]&&!(p===2&&r.skipThird)),last:null,due,known});}
 const localDay=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
 const earliest=v=>{const p=v.passes[0],r=state[v.x.id],prior=v.last||(p>0&&r.done?.[p-1]?localDay(r.done[p-1]):null);return prior?plus(prior,p===1?1:2):day};
 const assign=(v,p,date)=>{const r=state[v.x.id],dates=[...(r.dates||v.x.dates)],before=dates[p];dates[p]=date;r.dates=dates;if(before!==date)changes.push({id:v.x.id,field:'dates.'+p,before,after:date});v.last=date;if(v.known&&date>=v.due)late.push({id:v.x.id,pass:p,date,assessment:v.due})};
 for(let i=0;i<366&&[...pending.values()].some(v=>v.passes.length);i++){const date=plus(day,i);let remaining=capacity(date);while(remaining>=20){const eligible=[...pending.values()].filter(v=>v.passes.length&&(v.x.course!=='CVP'||!final||date<final)&&earliest(v)<=date).sort((a,b)=>{const score=v=>(v.due>=date&&v.due<=plus(date,3)?200:0)+(settings.hard?.(v.x)?40:0)+(v.passes[0]===0?60:v.passes[0]===1?30:0);return score(b)-score(a)||a.due.localeCompare(b.due)||a.x.id.localeCompare(b.x.id,undefined,{numeric:true})});const v=eligible.find(v=>[40,30,20][v.passes[0]]<=remaining);if(!v)break;const p=v.passes.shift();assign(v,p,date);remaining-=[40,30,20][p]}}
 // Even a zero-capacity study window cannot leave a stale date. Flag these dates as needing capacity.
 let cursor=day;for(const v of pending.values())while(v.passes.length){const p=v.passes.shift();if(v.x.course==='CVP'&&final){unplaced.push({id:v.x.id,pass:p,reason:'No capacity before the CVP final.'});continue;}const date=[cursor,earliest({...v,passes:[p]})].sort().at(-1);assign(v,p,date);capacityShortfall.push({id:v.x.id,pass:p,date});cursor=plus(date,1)}
 for(const x of items){const r=state[x.id];if(r.skipThird&&!r.done?.[2]){const afterSecond=r.done?.[1]?localDay(r.done[1]):r.dates?.[1]||day,date=[day,plus(afterSecond,2)].sort().at(-1),dates=[...(r.dates||x.dates)];if((x.course!=='CVP'||!final||date<final)&&dates[2]!==date){changes.push({id:x.id,field:'dates.2',before:dates[2],after:date});dates[2]=date;r.dates=dates}}}
 return {records:state,changes,omitted,unplaced,late,capacityShortfall,reset:true};
 }
 return {stampChanges,mergeRecords,mergeSettings,firstStudyAt,restoreThird,memoCapacity,thirdOptional,deadline,rebalance,automaticRebalance,freshPlan};
})();
